#!/usr/bin/env python3
"""
scripts/fetch-aduana.py
Descarga datos de DNA Aduanas (XMLA/Mondrian) y genera data/comercio-exterior.json

Uso local:  python scripts/fetch-aduana.py
GitHub Actions: corrido por .github/workflows/actualizar-aduana.yml

Env vars opcionales:
  ANOS   - años separados por coma, ej: "2025,2026"  (default: 2020-2026)
  FORZAR - "true" para forzar reescritura aunque no cambie nada
"""

import json, os, sys, time
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

import urllib3, requests
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Config ────────────────────────────────────────────────────────────────────
BASE    = 'https://biestadisticas.aduanas.gub.uy:8443/pentaho'
CATALOG = 'INTERNET_DRES'

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE    = ROOT / 'data' / 'comercio-exterior.json'
RUBROS_FILE = ROOT / 'data' / 'aduana-rubros.json'

_anos_env = os.environ.get('ANOS', '')
ANOS = [int(a.strip()) for a in _anos_env.split(',') if a.strip().isdigit()] \
       or list(range(2020, date.today().year + 1))

MESES_SET = '{' + ','.join(f'[FechaNumerado.Meses].[{m}]' for m in range(1,13)) + '}'

# ── HTTP / XMLA ───────────────────────────────────────────────────────────────
def login():
    s = requests.Session()
    s.verify = False
    s.post(
        f'{BASE}/j_spring_security_check',
        data='j_username=internet&j_password=internet&locale=en',
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        allow_redirects=False, timeout=30
    )
    return s

def xmla(sess, stmt, retry=2):
    env = (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
        '<soap:Body><Execute xmlns="urn:schemas-microsoft-com:xml-analysis">'
        f'<Command><Statement>{stmt}</Statement></Command>'
        '<Properties><PropertyList>'
        f'<Catalog>{CATALOG}</Catalog><Format>Tabular</Format>'
        '</PropertyList></Properties>'
        '</Execute></soap:Body></soap:Envelope>'
    )
    for attempt in range(retry + 1):
        try:
            r = sess.post(
                f'{BASE}/Xmla',
                data=env.encode('utf-8'),
                headers={'Content-Type': 'text/xml; charset=utf-8'},
                timeout=300
            )
            r.raise_for_status()
            root = ET.fromstring(r.content)
            # Buscar <row> con o sin namespace
            rows = root.findall('.//{urn:schemas-microsoft-com:xml-analysis:rowset}row')
            if not rows:
                rows = root.findall('.//row')
            return rows
        except Exception as e:
            if attempt == retry:
                raise
            print(f'  retry {attempt+1}/{retry}: {str(e)[:80]}', flush=True)
            time.sleep(8)

# ── Helpers de fila XML ───────────────────────────────────────────────────────
def col_str(row, name):
    """Extrae texto de un child element por nombre local (ignora namespace)."""
    for el in row:
        tag = el.tag.split('}')[-1] if '}' in el.tag else el.tag
        if tag == name:
            return (el.text or '').strip()
    return ''

def col_num(row, name):
    v = col_str(row, name)
    try:
        return float(v) if v else 0.0
    except ValueError:
        return 0.0

def mes_int(row):
    try:
        m = int(col_num(row, 'FechaNumerado.Meses'))
        return m if 1 <= m <= 12 else 0
    except Exception:
        return 0

def p4(cod):
    s = cod.strip()
    return (s[:4] if len(s) >= 4 else s).zfill(4)

# ── Acumulador de rubros ──────────────────────────────────────────────────────
def add_rubro(acc, ano, mes, cod, rmap, valor, peso):
    key4 = p4(cod)
    if key4 not in rmap:
        return
    r = rmap[key4]
    k = f"{ano}|{mes}|{r['rubro']}"
    if k in acc:
        acc[k]['valor'] += valor
        acc[k]['peso']  += peso
    else:
        acc[k] = dict(anio=ano, mes=mes, rubro=r['rubro'],
                      macro=r['macro'], valor=valor, peso=peso)

def flush_rubros(acc):
    return sorted(
        [dict(anio=v['anio'], mes=v['mes'], rubro=v['rubro'], macro=v['macro'],
              valor=round(v['valor']), peso=round(v['peso']))
         for v in acc.values()],
        key=lambda x: (x['anio'], x['mes'], x['macro'], x['rubro'])
    )

# ── MDX queries ───────────────────────────────────────────────────────────────
def q_expo_mensual(ano):
    return f"""SELECT {{[Measures].[VALORENADUANAEXPO],[Measures].[PesoNetoExp]}} ON COLUMNS,
NON EMPTY {MESES_SET} ON ROWS FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[{ano}],[Regimen.Regimen].[40 - Exportacion])"""

def q_impo_mensual(ano):
    return f"""SELECT {{[Measures].[PrecioCIFImp],[Measures].[PesoNetoImp]}} ON COLUMNS,
NON EMPTY {MESES_SET} ON ROWS FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[{ano}],[Regimen.Regimen].[10 - Importacion])"""

def q_expo_partida_crossjoin(ano):
    return f"""SELECT {{[Measures].[VALORENADUANAEXPO],[Measures].[PesoNetoExp]}} ON COLUMNS,
NON EMPTY CrossJoin({MESES_SET},[CodigoArancelario.Partidas].[Partida].Members) ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[{ano}],[Regimen.Regimen].[40 - Exportacion])"""

def q_impo_partida_crossjoin(ano):
    return f"""SELECT {{[Measures].[PrecioCIFImp],[Measures].[PesoNetoImp]}} ON COLUMNS,
NON EMPTY CrossJoin({MESES_SET},[CodigoArancelario.Partidas].[Partida].Members) ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[{ano}],[Regimen.Regimen].[10 - Importacion])"""

def q_expo_partida_mes(ano, mes):
    return f"""SELECT {{[Measures].[VALORENADUANAEXPO],[Measures].[PesoNetoExp]}} ON COLUMNS,
NON EMPTY [CodigoArancelario.Partidas].[Partida].Members ON ROWS FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[{ano}],[FechaNumerado.Meses].[{mes}],[Regimen.Regimen].[40 - Exportacion])"""

def q_impo_partida_mes(ano, mes):
    return f"""SELECT {{[Measures].[PrecioCIFImp],[Measures].[PesoNetoImp]}} ON COLUMNS,
NON EMPTY [CodigoArancelario.Partidas].[Partida].Members ON ROWS FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[{ano}],[FechaNumerado.Meses].[{mes}],[Regimen.Regimen].[10 - Importacion])"""

def q_expo_pais(ano):
    return f"""SELECT {{[Measures].[VALORENADUANAEXPO]}} ON COLUMNS,
NON EMPTY CrossJoin({MESES_SET},[PaisOrigenDestino.Paises].[Pais].Members) ON ROWS
FROM [ResumenDuas]
WHERE ([FechaNumerado.Anios].[{ano}],[Regimen.Regimen].[40 - Exportacion])"""

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print('Cargando rubros...')
    rubros_raw  = json.loads(RUBROS_FILE.read_text('utf-8'))
    expo_map    = {e['partida']: e for e in rubros_raw['expo']}
    impo_map    = {e['partida']: e for e in rubros_raw['impo']}

    expo_mensual   = []
    impo_mensual   = []
    expo_pais_mes  = []
    expo_rubro_acc = {}
    impo_rubro_acc = {}

    print(f'Autenticando... (años: {ANOS})')
    sess    = login()
    login_t = time.time()

    for ano in ANOS:
        if time.time() - login_t > 1080:   # re-login cada 18 min
            print(' [re-login]', flush=True)
            sess = login(); login_t = time.time()

        print(f'\n=== {ano} ===', flush=True)

        # 1. Totales mensuales EXPO
        print(' expo mensual... ', end='', flush=True)
        try:
            rows = xmla(sess, q_expo_mensual(ano))
            cnt = 0
            for row in rows:
                m = mes_int(row)
                if not m: continue
                expo_mensual.append(dict(
                    anio=ano, mes=m,
                    valor=round(col_num(row,'VALORENADUANAEXPO') * 1000),
                    peso=round(col_num(row,'PesoNetoExp'))
                ))
                cnt += 1
            print(f'{cnt} meses', flush=True)
        except Exception as e:
            print(f'ERROR: {e}', flush=True)

        # 2. Totales mensuales IMPO
        print(' impo mensual... ', end='', flush=True)
        try:
            rows = xmla(sess, q_impo_mensual(ano))
            cnt = 0
            for row in rows:
                m = mes_int(row)
                if not m: continue
                impo_mensual.append(dict(
                    anio=ano, mes=m,
                    valor=round(col_num(row,'PrecioCIFImp') * 1000),
                    peso=round(col_num(row,'PesoNetoImp'))
                ))
                cnt += 1
            print(f'{cnt} meses', flush=True)
        except Exception as e:
            print(f'ERROR: {e}', flush=True)

        # 3. EXPO por partida → rubros (CrossJoin, fallback mes a mes)
        print(' expo rubros... ', end='', flush=True)
        try:
            rows = xmla(sess, q_expo_partida_crossjoin(ano))
            cnt = 0
            for row in rows:
                m = mes_int(row)
                if not m: continue
                cod = col_str(row, 'CodigoArancelario.Partidas')
                add_rubro(expo_rubro_acc, ano, m, cod, expo_map,
                          col_num(row,'VALORENADUANAEXPO') * 1000,
                          col_num(row,'PesoNetoExp'))
                cnt += 1
            print(f'{cnt} filas', flush=True)
        except Exception as e:
            print(f'CrossJoin falló → mes a mes  ({str(e)[:50]})', flush=True)
            ok = 0
            for m in range(1, 13):
                try:
                    rows = xmla(sess, q_expo_partida_mes(ano, m))
                    for row in rows:
                        cod = col_str(row, 'CodigoArancelario.Partidas')
                        add_rubro(expo_rubro_acc, ano, m, cod, expo_map,
                                  col_num(row,'VALORENADUANAEXPO') * 1000,
                                  col_num(row,'PesoNetoExp'))
                    ok += 1
                except Exception as e2:
                    print(f'  {ano}/{m}: {e2}', flush=True)
            print(f' {ok}/12 meses OK', flush=True)

        # 4. IMPO por partida → rubros (CrossJoin, fallback mes a mes)
        print(' impo rubros... ', end='', flush=True)
        try:
            rows = xmla(sess, q_impo_partida_crossjoin(ano))
            cnt = 0
            for row in rows:
                m = mes_int(row)
                if not m: continue
                cod = col_str(row, 'CodigoArancelario.Partidas')
                add_rubro(impo_rubro_acc, ano, m, cod, impo_map,
                          col_num(row,'PrecioCIFImp') * 1000,
                          col_num(row,'PesoNetoImp'))
                cnt += 1
            print(f'{cnt} filas', flush=True)
        except Exception as e:
            print(f'CrossJoin falló → mes a mes  ({str(e)[:50]})', flush=True)
            ok = 0
            for m in range(1, 13):
                try:
                    rows = xmla(sess, q_impo_partida_mes(ano, m))
                    for row in rows:
                        cod = col_str(row, 'CodigoArancelario.Partidas')
                        add_rubro(impo_rubro_acc, ano, m, cod, impo_map,
                                  col_num(row,'PrecioCIFImp') * 1000,
                                  col_num(row,'PesoNetoImp'))
                    ok += 1
                except Exception as e2:
                    print(f'  {ano}/{m}: {e2}', flush=True)
            print(f' {ok}/12 meses OK', flush=True)

        # 5. EXPO por país × mes
        print(' expo x pais... ', end='', flush=True)
        try:
            rows = xmla(sess, q_expo_pais(ano))
            cnt = 0
            for row in rows:
                m    = mes_int(row)
                pais = col_str(row, 'PaisOrigenDestino.Paises')
                if not m or not pais: continue
                expo_pais_mes.append(dict(
                    anio=ano, mes=m, pais=pais,
                    valor=round(col_num(row,'VALORENADUANAEXPO') * 1000)
                ))
                cnt += 1
            print(f'{cnt} filas', flush=True)
        except Exception as e:
            print(f'ERROR: {e}', flush=True)

    # ── Armar output ──────────────────────────────────────────────────────────
    print('\nConsolidando rubros...')
    expo_rubro_mes = flush_rubros(expo_rubro_acc)
    impo_rubro_mes = flush_rubros(impo_rubro_acc)

    out = dict(
        meta=dict(
            generado=date.today().isoformat(),
            fuente='DNA Aduanas Uruguay',
            url_fuente='https://biestadisticas.aduanas.gub.uy:8443/pentaho',
            unidades_val='USD corrientes',
            peso_unidad='kg',
            notas='FOB para exportaciones; CIF para importaciones. '
                  'Unidades comerciales no disponibles en cubo ResumenDuas.',
            anos=ANOS,
        ),
        expo=dict(
            mensual =sorted(expo_mensual,  key=lambda x: (x['anio'], x['mes'])),
            porRubro=expo_rubro_mes,
            porPais =sorted(expo_pais_mes, key=lambda x: (x['anio'], x['mes'], -x['valor'])),
        ),
        impo=dict(
            mensual =sorted(impo_mensual,  key=lambda x: (x['anio'], x['mes'])),
            porRubro=impo_rubro_mes,
        ),
        rubros=dict(
            macro_expo=rubros_raw['macro_expo'],
            macro_impo=rubros_raw['macro_impo'],
        )
    )

    # Verificar cambios antes de escribir
    forzar = os.environ.get('FORZAR','false').lower() == 'true'
    new_json = json.dumps(out, ensure_ascii=False, separators=(',',':'))

    if OUT_FILE.exists() and not forzar:
        old = json.loads(OUT_FILE.read_text('utf-8'))
        if old.get('expo',{}).get('mensual') == out['expo']['mensual'] \
           and old.get('impo',{}).get('mensual') == out['impo']['mensual']:
            print('Sin cambios en totales — archivo no modificado.')
            print('(Usá FORZAR=true para forzar reescritura)')
            return

    OUT_FILE.write_text(new_json, encoding='utf-8')
    sz = OUT_FILE.stat().st_size // 1024

    print(f'\n✅ Guardado: {OUT_FILE.name} ({sz} KB)')
    print(f'  expo.mensual  : {len(expo_mensual)} filas')
    print(f'  expo.porRubro : {len(expo_rubro_mes)} filas')
    print(f'  expo.porPais  : {len(expo_pais_mes)} filas')
    print(f'  impo.mensual  : {len(impo_mensual)} filas')
    print(f'  impo.porRubro : {len(impo_rubro_mes)} filas')

if __name__ == '__main__':
    main()
