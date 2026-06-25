"""
Scraper de campos en venta — Escritorio Arrospide y otros sitios.
Genera data/ventas-campos.json que consume el sitio.

Uso:
    python scrape-campos.py

Requiere: pip install requests beautifulsoup4
"""
import json
import re
import time
from datetime import date
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
}

FUENTES = [
    {
        "nombre": "Escritorio Arrospide",
        "listado": "https://www.escritorioarrospide.com.uy/campos-en-venta/",
        "patron_url": "/campo/",
        "tipo": "arrospide",
    },
    {
        "nombre": "CamposOnline",
        "listado": "https://www.camposonline.com.uy/campos/resultado-de-busqueda.php?filt=1&fam=c&p=1",
        "patron_url": "/venta-de-campos/",
        "tipo": "camposonline",
        "paginas": 15,
        "pag_url": "https://www.camposonline.com.uy/campos/resultado-de-busqueda.php?filt=1&fam=c&p={n}",
    },
    # Agregar más fuentes aquí:
    # { "nombre": "...", "listado": "...", "patron_url": "...", "tipo": "generico" },
]

DEPARTAMENTOS = [
    "Artigas","Canelones","Cerro Largo","Colonia","Durazno","Flores","Florida",
    "Lavalleja","Maldonado","Montevideo","Paysandú","Río Negro","Rivera","Rocha",
    "Salto","San José","Soriano","Tacuarembó","Treinta y Tres",
]


def get(url, retries=3):
    for i in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
            return r
        except Exception as e:
            if i == retries - 1:
                print(f"  ERROR {url}: {e}")
                return None
            time.sleep(2)


def parse_numero(texto):
    """Extrae primer número (entero o decimal) de un string."""
    texto = texto.replace(".", "").replace(",", ".")
    m = re.search(r"[\d]+(?:\.\d+)?", texto)
    return float(m.group()) if m else None


def parse_precio(texto):
    """Parsea precios tipo 'U$S 4.500.000' o 'USD 3.000 la ha'."""
    limpio = texto.upper().replace("U$S", "").replace("USD", "").replace("$", "").strip()
    limpio = limpio.replace(".", "").replace(",", "")
    m = re.search(r"\d+", limpio)
    return int(m.group()) if m else None


def detectar_departamento(texto):
    texto_up = texto.upper()
    for d in DEPARTAMENTOS:
        if d.upper() in texto_up:
            return d
    return None


def scrape_detalle(url):
    """Extrae datos de una página de campo individual."""
    r = get(url)
    if not r:
        return None
    soup = BeautifulSoup(r.text, "html.parser")

    # Título
    titulo = ""
    h1 = soup.find("h1")
    if h1:
        titulo = h1.get_text(strip=True)

    # Texto completo de la página para búsquedas
    texto = soup.get_text(" ", strip=True)

    # Imagen principal
    imagen = ""
    og_img = soup.find("meta", property="og:image")
    if og_img:
        imagen = og_img.get("content", "")

    # Precio (busca patrones U$S / USD / $)
    precio_total = None
    precio_ha = None
    precio_m = re.search(
        r"(?:U\$S|USD|precio)[^\d]*?([\d][.\d]*\d+)", texto, re.IGNORECASE
    )
    if precio_m:
        precio_total = parse_precio(precio_m.group(1))

    precio_ha_m = re.search(
        r"(?:por\s+hect[aá]rea|\/\s*ha|por\s+ha)[^\d]*?([\d][.\d,]*)",
        texto, re.IGNORECASE
    )
    if precio_ha_m:
        precio_ha = parse_precio(precio_ha_m.group(1))

    # Hectáreas
    hectareas = None
    ha_m = re.search(r"([\d][.\d,]*)\s*(?:hect[aá]reas|has?\b)", texto, re.IGNORECASE)
    if ha_m:
        hectareas = parse_numero(ha_m.group(1))

    # CONEAT
    coneat = None
    coneat_m = re.search(r"CONEAT[^\d]*?([\d]+(?:[,.][\d]+)?)", texto, re.IGNORECASE)
    if coneat_m:
        coneat = parse_numero(coneat_m.group(1))

    # Departamento
    departamento = detectar_departamento(titulo) or detectar_departamento(texto[:2000])

    # Actividad principal
    actividad = "Campo"
    for kw in ["agrícola", "agricola", "arrocero", "arroz", "soja", "maíz", "maiz", "trigo"]:
        if kw.lower() in texto.lower():
            actividad = "Agrícola"
            break
    for kw in ["ganadero", "ganadería", "bovino", "ovino", "cría"]:
        if kw.lower() in texto.lower():
            actividad = "Ganadero" if actividad == "Campo" else actividad + " / Ganadero"
            break
    for kw in ["forestal", "eucaliptus", "pino"]:
        if kw.lower() in texto.lower():
            actividad = actividad + " / Forestal" if actividad != "Campo" else "Forestal"
            break
    for kw in ["lechero", "lechería", "tambo"]:
        if kw.lower() in texto.lower():
            actividad = actividad + " / Lechero" if actividad != "Campo" else "Lechero"
            break

    # Estado
    estado = "En venta"
    if "vendido" in texto.lower() or "sold" in texto.lower():
        estado = "Vendido"

    return {
        "titulo": titulo,
        "url": url,
        "fuente": urlparse(url).netloc.replace("www.", ""),
        "departamento": departamento or "",
        "hectareas": hectareas,
        "precio_usd": precio_total,
        "precio_ha": precio_ha,
        "coneat": coneat,
        "actividad": actividad,
        "imagen": imagen,
        "estado": estado,
        "fecha_scrape": str(date.today()),
    }


def scrape_listado(fuente):
    """Obtiene todos los URLs de campos desde la página de listado (Arrospide)."""
    r = get(fuente["listado"])
    if not r:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    urls = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if fuente["patron_url"] in href and href.startswith("http"):
            urls.add(href.rstrip("/") + "/")
    return sorted(urls)


def scrape_camposonline(fuente):
    """
    Parsea CamposOnline directamente desde las páginas de listado.
    Los datos clave (CONEAT, precio/ha, hectáreas) están en las cards, no hace
    falta seguir cada link.
    """
    BASE = "https://www.camposonline.com.uy"
    resultados = []
    paginas = fuente.get("paginas", 1)

    pag_tpl = fuente.get("pag_url", fuente["listado"] + "?page={n}")
    for pag in range(1, paginas + 1):
        url_pag = pag_tpl.format(n=pag)
        print(f"  Página {pag}/{paginas} ...", end=" ", flush=True)
        r = get(url_pag)
        if not r:
            print("ERROR")
            continue
        soup = BeautifulSoup(r.text, "html.parser")

        encontrados = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/venta-de-campos/" not in href:
                continue
            # Excluir links de navegación/filtro (sin referencia)
            if "ref-" not in href:
                continue

            url_full = BASE + href if href.startswith("/") else href
            url_full = url_full.rstrip("/") + "/"

            texto = a.get_text(" ", strip=True)

            # Departamento
            departamento = None
            strong = a.find("strong")
            if strong:
                raw_dpto = strong.get_text(strip=True).title()
                departamento = detectar_departamento(raw_dpto) or raw_dpto

            # Hectáreas
            hectareas = None
            ha_m = re.search(r"([\d][.\d,]*)\s*has?\b", texto, re.IGNORECASE)
            if ha_m:
                hectareas = parse_numero(ha_m.group(1))

            # CONEAT
            coneat = None
            c_m = re.search(r"I\.?\s*Coneat\s*([\d]+(?:[,.][\d]+)?)", texto, re.IGNORECASE)
            if c_m:
                coneat = parse_numero(c_m.group(1))

            # Precio/ha  (línea "USD 6.900")
            precio_ha = None
            # busca USD seguido de número (sin "/ha" obligatorio — en cards es siempre precio/ha)
            ph_m = re.search(r"USD\s*([\d][.\d,]+)", texto)
            if ph_m:
                precio_ha = parse_precio(ph_m.group(1))

            # Inversión total (línea "Inv. Total - USD 2.325.300")
            precio_usd = None
            inv_m = re.search(r"Inv\.?\s*Total[^0-9]*([\d][.\d,]+)", texto, re.IGNORECASE)
            if inv_m:
                precio_usd = parse_precio(inv_m.group(1))

            # Actividad desde h3 o texto
            actividad = "Campo"
            h3 = a.find("h3")
            if h3:
                h3txt = h3.get_text(strip=True).lower()
                if "agricola" in h3txt or "agrícola" in h3txt:
                    actividad = "Agricola"
                elif "ganadero" in h3txt or "ganaderia" in h3txt:
                    actividad = "Ganadero"
                elif "forestal" in h3txt:
                    actividad = "Forestal"
                elif "lechero" in h3txt or "tambo" in h3txt:
                    actividad = "Lechero"
                else:
                    actividad = h3.get_text(strip=True)

            # Imagen
            imagen = ""
            img = a.find("img")
            if img:
                imagen = img.get("src", "") or img.get("data-src", "")
                if imagen.startswith("/"):
                    imagen = BASE + imagen

            # Descartar si no tiene datos útiles
            if not departamento and not hectareas and not precio_ha and not coneat:
                continue

            resultados.append({
                "titulo": f"Campo en venta — {departamento or ''} {int(hectareas) if hectareas else ''} ha".strip(),
                "url": url_full,
                "fuente": "camposonline.com.uy",
                "departamento": departamento or "",
                "hectareas": hectareas,
                "precio_usd": precio_usd,
                "precio_ha": precio_ha,
                "coneat": coneat,
                "actividad": actividad,
                "imagen": imagen,
                "estado": "En venta",
                "fecha_scrape": str(date.today()),
            })
            encontrados += 1

        print(f"{encontrados} props")
        time.sleep(0.8)

    # Deduplicar por URL
    seen = set()
    uniq = []
    for r in resultados:
        if r["url"] not in seen:
            seen.add(r["url"])
            uniq.append(r)
    return uniq


def main():
    todos = []

    for fuente in FUENTES:
        print(f"\n=== {fuente['nombre']} ===")

        if fuente.get("tipo") == "camposonline":
            props = scrape_camposonline(fuente)
            print(f"  {len(props)} propiedades extraidas de CamposOnline")
            todos.extend(props)
            continue

        urls = scrape_listado(fuente)
        print(f"  {len(urls)} propiedades encontradas")

        for url in urls:
            print(f"  Scraping {url} ...", end=" ")
            datos = scrape_detalle(url)
            if datos:
                todos.append(datos)
                print(f"OK — {datos.get('departamento','')} {datos.get('hectareas','')} ha")
            time.sleep(1)  # cortesía con el servidor

    # Ordenar: en venta primero, luego por hectáreas desc
    todos.sort(key=lambda x: (x["estado"] != "En venta", -(x["hectareas"] or 0)))

    salida = {
        "fecha_actualizacion": str(date.today()),
        "total": len(todos),
        "propiedades": todos,
    }

    import os
    os.makedirs("data", exist_ok=True)
    ruta = "data/ventas-campos.json"
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=2)

    print(f"\nListo: {len(todos)} propiedades guardadas en {ruta}")


if __name__ == "__main__":
    main()
