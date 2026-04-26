#!/usr/bin/env python3
"""
actualizar-rhe.py
-----------------
Corre semanalmente vía GitHub Actions (martes).
Descarga el Excel de serie semanal RHE de INAC y actualiza data/rhe.json.
No necesita Claude — los datos son numéricos directos.
"""

import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import openpyxl

# ── Configuración ─────────────────────────────────────────────────────────────

RHE_JSON  = Path(__file__).parent.parent / "data" / "rhe.json"
TIMEOUT   = 30
HEADERS   = {"User-Agent": "CeterisParibusBot/1.0 (+https://ceterisparibus.uy)"}
EXCEL_URL = "https://www.inac.uy/innovaportal/v/11140/10/innova.front/serie-semanal-relacion-hacienda_exportacion---rhe"

MESES_ES = {
    1: "ene", 2: "feb", 3: "mar", 4: "abr", 5: "may", 6: "jun",
    7: "jul", 8: "ago", 9: "set", 10: "oct", 11: "nov", 12: "dic"
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def download_excel(url: str) -> bytes:
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    r.raise_for_status()
    return r.content


def parse_excel(content: bytes) -> dict:
    """
    Lee el Excel de serie semanal RHE y devuelve los datos de la última semana.
    Columnas (desde fila 8):
      A=inicio, B=fin, C=precio_export, D=precio_novillo, E=precio_vaca,
      F=rhe_novillo, G=rhe_vaca
    """
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active

    last_row = None
    for row in ws.iter_rows(min_row=8, values_only=True):
        inicio, fin, export, novillo, vaca, rhe_nov, rhe_vac = (row[i] for i in range(7))
        if inicio and export:
            last_row = {
                "inicio":   inicio,
                "fin":      fin,
                "export":   float(str(export).replace(",", ".")),
                "novillo":  float(str(novillo).replace(",", ".")),
                "vaca":     float(str(vaca).replace(",", ".")),
                "rhe_nov":  float(str(rhe_nov).replace(",", ".")),
                "rhe_vac":  float(str(rhe_vac).replace(",", "."))
            }

    if not last_row:
        raise ValueError("No se encontraron datos en el Excel")
    return last_row


def formato_periodo(inicio, fin) -> str:
    """Convierte fechas a 'DD-DD mes YYYY', ej: '12-18 abr 2026'."""
    if hasattr(inicio, "day"):
        d_ini = inicio
        d_fin = fin
    else:
        from datetime import datetime as _dt
        d_ini = _dt.strptime(str(inicio), "%Y-%m-%d %H:%M:%S") if " " in str(inicio) else _dt.strptime(str(inicio)[:10], "%Y-%m-%d")
        d_fin = _dt.strptime(str(fin),   "%Y-%m-%d %H:%M:%S") if " " in str(fin)   else _dt.strptime(str(fin)[:10],   "%Y-%m-%d")

    mes = MESES_ES[d_fin.month]
    return f"{d_ini.day}-{d_fin.day} {mes} {d_fin.year}"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    forzar = os.environ.get("FORZAR", "false").lower() == "true"

    # 1. Leer estado actual
    current = json.loads(RHE_JSON.read_text(encoding="utf-8"))
    print(f"📂 rhe.json actual: periodo={current.get('periodo')}")

    # 2. Descargar Excel
    print(f"📊 Descargando Excel de INAC...")
    try:
        content = download_excel(EXCEL_URL)
        print(f"   → {len(content):,} bytes")
    except Exception as e:
        print(f"❌ Error al descargar: {e}")
        sys.exit(1)

    # 3. Parsear última semana
    try:
        ultima = parse_excel(content)
        periodo = formato_periodo(ultima["inicio"], ultima["fin"])
        print(f"   → Última semana: {periodo}")
    except Exception as e:
        print(f"❌ Error al parsear Excel: {e}")
        sys.exit(1)

    # 4. Verificar si hay datos nuevos
    if periodo == current.get("periodo") and not forzar:
        print(f"✅ Sin datos nuevos ({periodo}). No se actualiza.")
        sys.exit(0)

    # 5. Construir rhe.json actualizado
    hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    updated = {
        "periodo":       periodo,
        "rhe_novillo":   round(ultima["rhe_nov"], 3),
        "rhe_vaca":      round(ultima["rhe_vac"], 3),
        "precio_export": round(ultima["export"],  3),
        "precio_novillo":round(ultima["novillo"], 3),
        "precio_vaca":   round(ultima["vaca"],    3),
        "actualizado":   hoy
    }

    # 6. Escribir
    RHE_JSON.write_text(
        json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"📝 rhe.json actualizado:")
    print(f"   📅 {current.get('periodo')} → {periodo}")
    print(f"   🐂 RHE Novillo: {current.get('rhe_novillo')} → {updated['rhe_novillo']}")
    print(f"   🐄 RHE Vaca:    {current.get('rhe_vaca')} → {updated['rhe_vaca']}")
    print(f"   💲 Export:      {current.get('precio_export')} → {updated['precio_export']} USD/kg")
    print(f"✅ Listo. Fecha: {hoy}")


if __name__ == "__main__":
    main()
