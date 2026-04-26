#!/usr/bin/env python3
"""
actualizar-rhe.py
-----------------
Corre semanalmente vía GitHub Actions.
Descarga el PDF de RHE de INAC, extrae el texto con pdfplumber,
y usa Claude para actualizar data/rhe.json.
Solo hace commit si algo relevante cambió.
"""

import json
import os
import sys
import copy
import io
from datetime import datetime, timezone
from pathlib import Path

import anthropic
import requests
import pdfplumber

# ── Configuración ────────────────────────────────────────────────────────────

RHE_JSON = Path(__file__).parent.parent / "data" / "rhe.json"
TIMEOUT = 30
HEADERS = {"User-Agent": "CeterisParibusBot/1.0 (+https://ceterisparibus.uy)"}
PDF_URL = "https://www.inac.uy/innovaportal/file/15205/1/monitoreo-ipx-hac-rhe.pdf"

# ── Prompts ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Sos el sistema automático de actualización del monitor RHE de ceterisparibus.uy.

Tu trabajo es leer el texto extraído del PDF semanal de INAC y actualizar rhe.json con los datos más recientes.

REGLAS ESTRICTAS:
- Devolvés ÚNICAMENTE JSON válido, sin texto adicional, sin markdown, sin explicaciones.
- No inventés datos. Si no encontrás un dato, dejás el valor anterior.
- El campo "actualizado" siempre se actualiza a la fecha de hoy (formato YYYY-MM-DD).
- "periodo": período de la semana en formato "DD-DD mes YYYY" (ej: "5-11 abril 2026")
- "rhe_novillo": valor decimal del RHE para novillo (ej: 0.957 significa 95.7%)
- "rhe_vaca": valor decimal del RHE para vaca
- "precio_export": precio de exportación en USD/kg
- "precio_novillo": precio de hacienda novillo en USD/kg
- "precio_vaca": precio de hacienda vaca en USD/kg

El JSON de salida debe mantener EXACTAMENTE la misma estructura que el JSON de entrada."""


# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_pdf_text(url: str) -> str:
    """Descarga el PDF y extrae texto y tablas con pdfplumber."""
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    r.raise_for_status()

    parts = []
    with pdfplumber.open(io.BytesIO(r.content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
            for table in page.extract_tables():
                for row in table:
                    if row:
                        parts.append(" | ".join(str(c) for c in row if c))

    return "\n".join(parts)[:8000]


def rhe_sin_fecha(d: dict) -> dict:
    c = copy.deepcopy(d)
    c.pop("actualizado", None)
    return c


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ANTHROPIC_API_KEY no configurada.")
        sys.exit(1)

    forzar = os.environ.get("FORZAR", "false").lower() == "true"

    # 1. Leer rhe.json actual
    current = json.loads(RHE_JSON.read_text(encoding="utf-8"))
    print(f"📂 rhe.json actual: periodo={current.get('periodo')}")

    # 2. Descargar PDF y extraer texto
    print(f"📄 Descargando PDF de INAC: {PDF_URL}")
    try:
        pdf_text = fetch_pdf_text(PDF_URL)
        print(f"   → {len(pdf_text)} caracteres extraídos")
        if len(pdf_text) < 100:
            print("⚠️  Poco texto extraído — el PDF puede haber cambiado de formato.")
    except Exception as e:
        print(f"❌ Error al obtener PDF: {e}")
        sys.exit(1)

    # 3. Llamar a Claude
    hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print("🤖 Consultando Claude...")
    client = anthropic.Anthropic(api_key=api_key)

    user_prompt = f"""Hoy es {hoy}.

## Estado actual (data/rhe.json):
{json.dumps(current, ensure_ascii=False, indent=2)}

## Texto extraído del PDF semanal de INAC (RHE Bovinos):
{pdf_text}

---
Identificá los datos más recientes del PDF y actualizá el JSON.
Recordá: SOLO JSON, sin texto extra."""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}]
    )

    respuesta = message.content[0].text.strip()

    # 4. Parsear JSON de respuesta
    try:
        if respuesta.startswith("```"):
            respuesta = respuesta.split("```")[1]
            if respuesta.startswith("json"):
                respuesta = respuesta[4:]
        updated = json.loads(respuesta)
    except json.JSONDecodeError as e:
        print(f"❌ Claude no devolvió JSON válido: {e}")
        print(f"Respuesta:\n{respuesta[:500]}")
        sys.exit(1)

    # 5. Comparar (sin campo "actualizado")
    sin_fecha_actual = rhe_sin_fecha(current)
    sin_fecha_nuevo = rhe_sin_fecha(updated)
    hubo_cambios = sin_fecha_actual != sin_fecha_nuevo

    if not hubo_cambios and not forzar:
        print("✅ Sin cambios relevantes. No se actualiza rhe.json.")

    # 6. Escribir rhe.json
    RHE_JSON.write_text(
        json.dumps(updated, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

    if hubo_cambios:
        print("📝 rhe.json actualizado:")
        if current.get("periodo") != updated.get("periodo"):
            print(f"   📅 Período: {current['periodo']} → {updated['periodo']}")
        if current.get("rhe_novillo") != updated.get("rhe_novillo"):
            print(f"   🐂 RHE Novillo: {current['rhe_novillo']} → {updated['rhe_novillo']}")
        if current.get("rhe_vaca") != updated.get("rhe_vaca"):
            print(f"   🐄 RHE Vaca: {current['rhe_vaca']} → {updated['rhe_vaca']}")
        if current.get("precio_novillo") != updated.get("precio_novillo"):
            print(f"   💲 Precio novillo: {current['precio_novillo']} → {updated['precio_novillo']}")
    else:
        print("📝 Sin cambios de contenido — solo se actualiza la fecha.")

    print(f"✅ Listo. Período: {updated.get('periodo')}")


if __name__ == "__main__":
    main()
