#!/usr/bin/env python3
"""
actualizar-novillo.py
---------------------
Corre cada 2 días vía GitHub Actions.
Descarga el Excel de Novillo Tipo 2.0 de INAC y actualiza
data/novillo.json y data/novillo-tipo-serie.json.
No necesita Claude — los datos son numéricos directos.
"""

import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import xlrd

# ── Configuración ─────────────────────────────────────────────────────────────

NOVILLO_JSON = Path(__file__).parent.parent / "data" / "novillo.json"
SERIE_JSON   = Path(__file__).parent.parent / "data" / "novillo-tipo-serie.json"
TIMEOUT = 30
HEADERS  = {"User-Agent": "CeterisParibusBot/1.0 (+https://ceterisparibus.uy)"}
EXCEL_URL = "https://www.inac.uy/innovaportal/v/21699/10/innova.front/serie-mensual-novillo-tipo-20"

MESES_NOMBRE = {
    "ene": "enero", "feb": "febrero", "mar": "marzo",  "abr": "abril",
    "may": "mayo",  "jun": "junio",   "jul": "julio",  "ago": "agosto",
    "set": "setiembre", "sep": "setiembre",
    "oct": "octubre", "nov": "noviembre", "dic": "diciembre"
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def download_excel(url: str) -> bytes:
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    r.raise_for_status()
    return r.content


def parse_excel(content: bytes) -> list:
    """Extrae la serie mensual desde el Excel de INAC."""
    try:
        wb = xlrd.open_workbook(file_contents=content)
    except Exception:
        # Intentar como xlsx con openpyxl
        import openpyxl, io as _io
        wb2 = openpyxl.load_workbook(_io.BytesIO(content), data_only=True)
        ws2 = wb2.active
        rows = []
        for row in ws2.iter_rows(min_row=9, values_only=True):
            mes, nov, vh, vai = (row[i] for i in range(4))
            if mes and nov:
                rows.append({
                    "mes": str(mes).strip(),
                    "novillo": int(round(float(nov))),
                    "vh":      int(round(float(vh))),
                    "vai":     int(round(float(vai)))
                })
        return rows

    ws = wb.sheet_by_index(0)
    rows = []
    for r in range(8, ws.nrows):   # fila 9 en base 1 = índice 8
        mes_cell = ws.cell(r, 0)
        nov_cell = ws.cell(r, 1)
        if mes_cell.ctype not in (xlrd.XL_CELL_TEXT, xlrd.XL_CELL_NUMBER):
            continue
        mes = str(mes_cell.value).strip()
        if not mes or mes == "0.0":
            continue
        try:
            rows.append({
                "mes":     mes,
                "novillo": int(round(float(ws.cell(r, 1).value))),
                "vh":      int(round(float(ws.cell(r, 2).value))),
                "vai":     int(round(float(ws.cell(r, 3).value)))
            })
        except (ValueError, TypeError):
            continue
    return rows


def pct(new_val: int, old_val: int) -> float:
    if not old_val:
        return 0.0
    return round((new_val - old_val) / old_val * 100, 1)


def mes_label(mes_str: str) -> str:
    """Convierte 'Mar-26' → 'marzo 2026'."""
    partes = mes_str.split("-")
    if len(partes) != 2:
        return mes_str
    abrev = partes[0].lower()
    anio  = "20" + partes[1] if len(partes[1]) == 2 else partes[1]
    return MESES_NOMBRE.get(abrev, abrev) + " " + anio


def mismo_mes_año_anterior(serie: list, ultimo: dict) -> dict | None:
    """Encuentra la entrada del mismo mes del año anterior."""
    abrev_actual = ultimo["mes"].split("-")[0].lower()
    for d in reversed(serie[:-1]):
        if d["mes"].split("-")[0].lower() == abrev_actual:
            return d
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    forzar = os.environ.get("FORZAR", "false").lower() == "true"

    # 1. Leer estado actual
    current_serie = json.loads(SERIE_JSON.read_text(encoding="utf-8"))
    ultimo_mes_actual = current_serie[-1]["mes"] if current_serie else ""
    print(f"📂 Serie actual: último mes = {ultimo_mes_actual}")

    # 2. Descargar Excel
    print(f"📊 Descargando Excel de INAC...")
    try:
        content = download_excel(EXCEL_URL)
        print(f"   → {len(content):,} bytes descargados")
    except Exception as e:
        print(f"❌ Error al descargar: {e}")
        sys.exit(1)

    # 3. Parsear
    try:
        serie = parse_excel(content)
        print(f"   → {len(serie)} filas, último mes: {serie[-1]['mes']}")
    except Exception as e:
        print(f"❌ Error al parsear Excel: {e}")
        sys.exit(1)

    if not serie:
        print("❌ No se obtuvieron datos del Excel.")
        sys.exit(1)

    # 4. Verificar si hay datos nuevos
    ultimo_mes_nuevo = serie[-1]["mes"]
    if ultimo_mes_nuevo == ultimo_mes_actual and not forzar:
        print(f"✅ Sin datos nuevos ({ultimo_mes_actual}). No se actualiza.")
        sys.exit(0)

    # 5. Calcular variaciones
    ultimo   = serie[-1]
    anterior = serie[-2] if len(serie) >= 2 else None
    año_ant  = mismo_mes_año_anterior(serie, ultimo)

    var_m_nov = pct(ultimo["novillo"], anterior["novillo"]) if anterior else 0.0
    var_a_nov = pct(ultimo["novillo"], año_ant["novillo"])  if año_ant  else None
    var_m_vh  = pct(ultimo["vh"],      anterior["vh"])      if anterior else 0.0
    var_a_vh  = pct(ultimo["vh"],      año_ant["vh"])       if año_ant  else None
    var_m_vai = pct(ultimo["vai"],     anterior["vai"])     if anterior else 0.0
    var_a_vai = pct(ultimo["vai"],     año_ant["vai"])      if año_ant  else None

    vh_pct  = round(ultimo["vh"]  / ultimo["novillo"] * 100)
    vai_pct = round(ultimo["vai"] / ultimo["novillo"] * 100)

    # 6. Construir novillo.json actualizado
    hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    updated = {
        "valor":            ultimo["novillo"],
        "periodo":          mes_label(ultimo["mes"]),
        "actualizado":      hoy,
        "variacion":        var_m_nov,
        "vh":               ultimo["vh"],
        "vh_participacion": vh_pct,
        "vh_variacion":     var_m_vh,
        "vai":              ultimo["vai"],
        "vai_participacion": vai_pct,
        "vai_variacion":    var_m_vai
    }
    if var_a_nov is not None: updated["variacion_año"]    = var_a_nov
    if var_a_vh  is not None: updated["vh_variacion_año"] = var_a_vh
    if var_a_vai is not None: updated["vai_variacion_año"] = var_a_vai

    # 7. Escribir archivos
    NOVILLO_JSON.write_text(
        json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    SERIE_JSON.write_text(
        json.dumps(serie, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"📝 Actualizado:")
    print(f"   📅 {ultimo_mes_actual} → {ultimo_mes_nuevo}")
    print(f"   🐂 Novillo: {ultimo['novillo']} USD/cab ({'+' if var_m_nov >= 0 else ''}{var_m_nov}% vs mes ant)")
    if var_a_nov is not None:
        print(f"   📆 vs año ant: {'+' if var_a_nov >= 0 else ''}{var_a_nov}%")
    print(f"✅ Listo. Fecha: {hoy}")


if __name__ == "__main__":
    main()
