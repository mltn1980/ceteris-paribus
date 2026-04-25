#!/usr/bin/env python3
"""
actualizar-clima.py
-------------------
Corre diariamente vía GitHub Actions.
Consulta IRI, NOAA, INUMET y MetSul, y actualiza data/clima.json
usando Claude para interpretar los cambios.
Solo hace cambio si algo relevante cambió.
"""

import json
import os
import sys
import copy
from datetime import datetime, timezone
from pathlib import Path

import anthropic
import requests

# ── Configuración ────────────────────────────────────────────────────────────

CLIMA_JSON = Path(__file__).parent.parent / "data" / "clima.json"
TIMEOUT = 20
HEADERS = {"User-Agent": "CeterisParibusBot/1.0 (+https://ceterisparibus.uy)"}

FUENTES = {
    "iri": "https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/",
    "noaa_oni": "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
    "inumet": "https://www.inumet.gub.uy/",
    "inumet_tendencias": "https://www.inumet.gub.uy/clima/tendencias-climaticas",
    "metsul": "https://metsul.com/",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch(url: str, max_chars: int = 8000) -> str:
    """Descarga una URL y devuelve texto limpio (sin HTML)."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        text = r.text
        # Si es HTML, extraer solo texto
        if "<html" in text.lower():
            import re
            text = re.sub(r"<script[^>]*>[\s\S]*?</script>", "", text, flags=re.I)
            text = re.sub(r"<style[^>]*>[\s\S]*?</style>", "", text, flags=re.I)
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
        return text[:max_chars]
    except Exception as e:
        return f"[Error al obtener {url}: {e}]"


def clima_sin_fecha(d: dict) -> dict:
    """Devuelve el clima.json sin el campo 'actualizado' para comparar contenido."""
    c = copy.deepcopy(d)
    c.pop("actualizado", None)
    return c


# ── Prompt para Claude ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Sos el sistema automático de actualización del Monitor Climático de ceterisparibus.uy,
un dashboard agroclimático para Uruguay.

Tu trabajo es comparar los datos actuales del sitio con la información fresca de las fuentes,
e identificar qué cambió para actualizar SOLO eso.

REGLAS ESTRICTAS:
- Devolvés ÚNICAMENTE JSON válido, sin texto adicional, sin markdown, sin explicaciones.
- No inventés datos. Si no encontrás un dato nuevo, dejás el valor anterior.
- El campo "actualizado" siempre se actualiza a la fecha de hoy.
- Alerta: se activa con cualquier aviso de INUMET o MetSul (vientos, lluvias intensas, heladas, tormentas, ciclones).
  Si no hay alerta activa, alerta.activa = false y los demás campos de alerta pueden quedar vacíos.
- Niño 3.4: buscá el valor más reciente en los datos de NOAA/IRI. Es semanal.
- Probabilidades ENSO: actualizá si IRI publicó nuevo pronóstico mensual.
- INUMET estacional: actualizá si hay nuevo informe trimestral.
- Fechas en español corto: "25 abr 2026", "may 2026", etc.
- Períodos trimestres: "Abr-May-Jun 2026", "May-Jun-Jul 2026", etc.

El JSON de salida debe mantener EXACTAMENTE la misma estructura que el JSON de entrada."""


def build_user_prompt(current: dict, fuentes_texto: dict) -> str:
    hoy = datetime.now(timezone.utc).strftime("%d %b %Y").lower().replace(
        "jan","ene").replace("feb","feb").replace("mar","mar").replace("apr","abr").replace(
        "may","may").replace("jun","jun").replace("jul","jul").replace("aug","ago").replace(
        "sep","set").replace("oct","oct").replace("nov","nov").replace("dec","dic")

    return f"""Hoy es {hoy}.

## Estado actual del sitio (data/clima.json):
{json.dumps(current, ensure_ascii=False, indent=2)}

## Fuentes consultadas hoy:

### IRI/Columbia — Pronóstico ENSO:
{fuentes_texto['iri']}

### NOAA CPC — Índice ONI (últimas entradas):
{fuentes_texto['noaa_oni']}

### INUMET — Página principal (alertas Uruguay):
{fuentes_texto['inumet']}

### INUMET — Tendencias climáticas (listado de informes):
{fuentes_texto['inumet_tendencias']}

### MetSul — Página principal (alertas región):
{fuentes_texto['metsul']}

---
Analizá qué cambió vs el estado actual y devolvé el clima.json actualizado.
Recordá: SOLO JSON, sin texto extra."""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY no configurada.")
        sys.exit(1)

    forzar = os.environ.get("FORZAR", "false").lower() == "true"

    # 1. Leer clima.json actual
    current = json.loads(CLIMA_JSON.read_text(encoding="utf-8"))
    print(f"📂 clima.json actual: actualizado={current.get('actualizado')}")

    # 2. Descargar fuentes
    print("🌐 Descargando fuentes...")
    fuentes_texto = {}
    for nombre, url in FUENTES.items():
        print(f"   → {nombre}: {url}")
        # NOAA ONI: tomar solo las últimas 50 líneas (datos recientes)
        texto = fetch(url, max_chars=10000)
        if nombre == "noaa_oni":
            lineas = texto.strip().split("\n")
            texto = "\n".join(lineas[-50:])  # últimas 50 entradas
        fuentes_texto[nombre] = texto

    # 3. Llamar a Claude
    print("🤖 Consultando Claude...")
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": build_user_prompt(current, fuentes_texto)}
        ]
    )

    respuesta = message.content[0].text.strip()

    # 4. Parsear JSON de respuesta
    try:
        # Remover posibles bloques markdown
        if respuesta.startswith("```"):
            respuesta = respuesta.split("```")[1]
            if respuesta.startswith("json"):
                respuesta = respuesta[4:]
        updated = json.loads(respuesta)
    except json.JSONDecodeError as e:
        print(f"❌ Claude no devolvió JSON válido: {e}")
        print(f"Respuesta:\n{respuesta[:500]}")
        sys.exit(1)

    # 5. Comparar (excluyendo "actualizado")
    sin_fecha_actual = clima_sin_fecha(current)
    sin_fecha_nuevo = clima_sin_fecha(updated)

    hubo_cambios = sin_fecha_actual != sin_fecha_nuevo

    if not hubo_cambios and not forzar:
        print("✅ Sin cambios relevantes. No se actualiza clima.json.")
        # Aún así actualizamos la fecha para saber que corrió
        # (opcional — comentar si no querés commits vacíos de fecha)
        # sys.exit(0)

    # 6. Escribir clima.json actualizado
    CLIMA_JSON.write_text(
        json.dumps(updated, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

    if hubo_cambios:
        print("📝 clima.json actualizado con cambios:")
        # Mostrar qué cambió
        if current.get("alerta", {}).get("activa") != updated.get("alerta", {}).get("activa"):
            estado = "ACTIVADA" if updated["alerta"]["activa"] else "desactivada"
            print(f"   🚨 Alerta: {estado} — {updated['alerta'].get('titulo','')}")
        if current.get("enso", {}).get("nino34") != updated.get("enso", {}).get("nino34"):
            print(f"   🌡️ Niño 3.4: {current['enso']['nino34']} → {updated['enso']['nino34']}")
        if current.get("enso", {}).get("perspectiva_pct") != updated.get("enso", {}).get("perspectiva_pct"):
            print(f"   📊 Perspectiva: {updated['enso']['perspectiva_pct']}")
    else:
        print("📝 Sin cambios de contenido — solo se actualiza la fecha.")

    print(f"✅ Listo. Fecha: {updated.get('actualizado')}")


if __name__ == "__main__":
    main()
