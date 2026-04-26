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


def parse_excel(content: bytes) -> list:
    """
    Lee el Excel de serie semanal RHE y devuelve todas las filas como lista.
    Columnas (desde fila 8):
      A=inicio, B=fin, C=precio_export, D=precio_novillo, E=precio_vaca,
      F=rhe_novillo, G=rhe_vaca
    """
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active

    rows = []
    for row in ws.iter_rows(min_row=8, values_only=True):
        inicio, fin, export, novillo, vaca, rhe_nov, rhe_vac = (row[i] for i in range(7))
        if inicio and export:
            rows.append({
                "inicio":   inicio,
                "fin":      fin,
                "export":   float(str(export).replace(",", ".")),
                "novillo":  float(str(novillo).replace(",", ".")),
                "vaca":     float(str(vaca).replace(",", ".")),
                "rhe_nov":  float(str(rhe_nov).replace(",", ".")),
                "rhe_vac":  float(str(rhe_vac).replace(",", "."))
            })

    if not rows:
        raise ValueError("No se encontraron datos en el Excel")
    return rows


def to_date(val) -> datetime:
    if hasattr(val, "year"):
        return val
    s = str(val)
    return datetime.strptime(s[:10], "%Y-%m-%d")


def promedio_mes_año_ant(serie: list, ultima: dict) -> dict | None:
    """Promedia todas las semanas del mismo mes del año anterior (por fecha fin)."""
    fin_actual = to_date(ultima["fin"])
    mes_obj = fin_actual.month
    año_obj = fin_actual.year - 1
    semanas = [
        row for row in serie[:-1]
        if to_date(row["fin"]).month == mes_obj and to_date(row["fin"]).year == año_obj
    ]
    if not semanas:
        return None
    n = len(semanas)
    return {
        "export":   sum(r["export"]  for r in semanas) / n,
        "novillo":  sum(r["novillo"] for r in semanas) / n,
        "vaca":     sum(r["vaca"]    for r in semanas) / n,
        "rhe_nov":  sum(r["rhe_nov"] for r in semanas) / n,
        "rhe_vac":  sum(r["rhe_vac"] for r in semanas) / n,
        "n_semanas": n,
        "mes": MESES_ES[mes_obj],
        "año": año_obj,
    }


def pct(nuevo, anterior) -> float:
    if not anterior:
        return 0.0
    return round((nuevo - anterior) / anterior * 100, 1)


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

    # 3. Parsear todas las semanas
    try:
        serie = parse_excel(content)
        ultima = serie[-1]
        periodo = formato_periodo(ultima["inicio"], ultima["fin"])
        print(f"   → {len(serie)} semanas, última: {periodo}")
    except Exception as e:
        print(f"❌ Error al parsear Excel: {e}")
        sys.exit(1)

    # 4. Verificar si hay datos nuevos
    if periodo == current.get("periodo") and not forzar:
        print(f"✅ Sin datos nuevos ({periodo}). No se actualiza.")
        sys.exit(0)

    # 5. Promedio del mismo mes del año anterior
    prom_ant = promedio_mes_año_ant(serie, ultima)
    if prom_ant:
        ref_label = f"prom. {prom_ant['mes']} {prom_ant['año']} ({prom_ant['n_semanas']} sem.)"
        print(f"   → Referencia i.a.: {ref_label}")
        export_var_a  = pct(ultima["export"],  prom_ant["export"])
        novillo_var_a = pct(ultima["novillo"], prom_ant["novillo"])
        vaca_var_a    = pct(ultima["vaca"],    prom_ant["vaca"])
        rhe_nov_var_a = round((ultima["rhe_nov"] - prom_ant["rhe_nov"]) * 100, 1)
        rhe_vac_var_a = round((ultima["rhe_vac"] - prom_ant["rhe_vac"]) * 100, 1)
        periodo_ant   = f"prom. {prom_ant['mes']} {prom_ant['año']}"
    else:
        periodo_ant = None
        export_var_a = novillo_var_a = vaca_var_a = rhe_nov_var_a = rhe_vac_var_a = None

    # 6. Construir rhe.json actualizado
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
    if periodo_ant:
        updated["periodo_año_ant"] = periodo_ant
        updated["export_var_a"]    = export_var_a
        updated["novillo_var_a"]   = novillo_var_a
        updated["vaca_var_a"]      = vaca_var_a
        updated["rhe_nov_var_a"]   = rhe_nov_var_a
        updated["rhe_vac_var_a"]   = rhe_vac_var_a

    # 7. Escribir
    RHE_JSON.write_text(
        json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"📝 rhe.json actualizado:")
    print(f"   📅 {current.get('periodo')} → {periodo}")
    print(f"   🐂 RHE Novillo: {current.get('rhe_novillo')} → {updated['rhe_novillo']}")
    print(f"   🐄 RHE Vaca:    {current.get('rhe_vaca')} → {updated['rhe_vaca']}")
    print(f"   💲 Export:      {current.get('precio_export')} → {updated['precio_export']} USD/kg")
    if periodo_ant:
        print(f"   📆 vs {periodo_ant}: Export {'+' if export_var_a >= 0 else ''}{export_var_a}%, Novillo {'+' if novillo_var_a >= 0 else ''}{novillo_var_a}%, Vaca {'+' if vaca_var_a >= 0 else ''}{vaca_var_a}%")
    print(f"✅ Listo. Fecha: {hoy}")


if __name__ == "__main__":
    main()
