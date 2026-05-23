#!/usr/bin/env python3
"""
scripts/generar-aduana-html.py
Lee data/comercio-exterior.json y genera comercio-exterior.html
Corre después de fetch-aduana.py en el workflow de GitHub Actions.
"""
import json, math
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
JSON_FILE = ROOT / 'data' / 'comercio-exterior.json'
OUT_HTML  = ROOT / 'comercio-exterior.html'

MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
MESES_L = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
           'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

# ── Helpers de cómputo ────────────────────────────────────────────────────────
def sum_mes(series, anio, mes, key='valor'):
    return sum(r[key] for r in series if r['anio']==anio and r['mes']==mes)

def sum_ytd(series, anio, max_mes, key='valor'):
    return sum(r[key] for r in series if r['anio']==anio and r['mes']<=max_mes)

def yoy(actual, anterior):
    if not anterior: return None
    return (actual - anterior) / anterior * 100

def fmt_m(v):          return f"{v/1e6:.1f}"
def fmt_mm(v):         return f"{v/1e6:.0f}"
def fmt_sign(v):       return f"+{v:.1f}%" if v >= 0 else f"{v:.1f}%"
def fmt_bal(v):        return f"−{abs(v/1e6):.0f}" if v < 0 else f"+{v/1e6:.0f}"
def arrow(v):          return "▲" if v >= 0 else "▼"
def cls_dir(v):        return "d-up" if v is not None and v >= 0 else "d-down"
def color_dir(v):      return "var(--green)" if v is not None and v >= 0 else "var(--red)"
def clamp_yoy(v):
    if v is None: return "n/d"
    if v > 999: return ">999%"
    if v < -99: return f"{v:.1f}%"
    return fmt_sign(v)

def rubros_ytd(porRubro, anio, max_mes):
    acc = defaultdict(lambda: {'valor': 0, 'peso': 0, 'macro': '', 'color': ''})
    for r in porRubro:
        if r['anio'] == anio and r['mes'] <= max_mes:
            acc[r['rubro']]['valor'] += r['valor']
            acc[r['rubro']]['peso']  += r['peso']
            acc[r['rubro']]['macro']  = r['macro']
    return sorted(acc.items(), key=lambda x: -x[1]['valor'])

def paises_ytd(porPais, anio, max_mes, top=20):
    acc = defaultdict(int)
    for r in porPais:
        if r['anio'] == anio and r['mes'] <= max_mes:
            acc[r['pais']] += r['valor']
    return sorted(acc.items(), key=lambda x: -x[1])[:top]

def periodo_txt(max_mes, anio):
    meses_abbr = [MESES[m].lower() for m in range(1, max_mes+1)]
    if max_mes == 1: rng = meses_abbr[0]
    elif max_mes <= 3: rng = '–'.join([meses_abbr[0], meses_abbr[-1]])
    else: rng = f"{meses_abbr[0]}–{meses_abbr[-1]}"
    return f"{rng} {anio}"

# ── Helpers HTML ──────────────────────────────────────────────────────────────
def bar_expo(rubro, valor_m, pct_val, yoy_val, max_val_m, color='#2DD4BF'):
    w   = max(2, round(valor_m / max_val_m * 96)) if max_val_m else 0
    yv  = clamp_yoy(yoy_val)
    cls = 'bar-var-up' if yoy_val is not None and yoy_val >= 0 else 'bar-var-dn'
    ar  = arrow(yoy_val) if yoy_val is not None else ''
    lbl = rubro[:32]
    hex_rgb = color.lstrip('#')
    r_,g_,b_ = int(hex_rgb[0:2],16), int(hex_rgb[2:4],16), int(hex_rgb[4:6],16)
    return f'''    <div class="bar-row-ext">
      <div class="bar-label">{lbl}</div>
      <div class="bar-track"><div class="bar-fill" style="width:{w}%;background:rgba({r_},{g_},{b_},0.18);border:1.5px solid {color};box-sizing:border-box"></div></div>
      <div class="bar-num">{valor_m:.1f}</div>
      <div class="bar-pond">{pct_val:.1f}%</div>
      <div class="{cls}">{ar} {yv}</div>
    </div>'''

def table_row_expo(rubro, color, valor_m, pct_val, yoy_val, incid_pp):
    vc   = color_dir(yoy_val)
    yv   = clamp_yoy(yoy_val)
    yp   = f'+{incid_pp:.1f} pp' if incid_pp >= 0 else f'{incid_pp:.1f} pp'
    return f'''          <tr style="border-bottom:1px solid rgba(139,176,212,.07)">
            <td style="font-size:13px;color:var(--ink);padding:10px 0;display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:{color};flex-shrink:0;display:inline-block"></span>{rubro}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink2);padding:10px 12px;text-align:right">{valor_m:.1f}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink2);padding:10px 12px;text-align:right">{pct_val:.1f}%</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:{vc};padding:10px 12px;text-align:right">{yv}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:{vc};padding:10px 0;text-align:right">{yp}</td>
          </tr>'''

def pais_bar(pais, valor_m, pct_val, w_pct, yoy_val):
    vc  = color_dir(yoy_val)
    yv  = clamp_yoy(yoy_val)
    return f'''          <tr style="border-bottom:1px solid rgba(139,176,212,.07)">
            <td style="font-size:13px;color:var(--ink);padding:10px 0">{pais}</td>
            <td style="padding:10px 12px;min-width:120px"><div style="background:rgba(139,176,212,.06);border-radius:2px;overflow:hidden;height:14px"><div style="width:{w_pct}%;height:14px;background:#2DD4BF;border-radius:2px;opacity:.7"></div></div></td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink2);padding:10px 12px;text-align:right">{valor_m:.1f}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink2);padding:10px 12px;text-align:right">{pct_val:.1f}%</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:{vc};padding:10px 0;text-align:right">{yv}</td>
          </tr>'''

# ── Cómputo principal ─────────────────────────────────────────────────────────
def compute(data):
    em   = data['expo']['mensual']
    im   = data['impo']['mensual']
    er   = data['expo']['porRubro']
    ir   = data['impo']['porRubro']
    ep   = data['expo']['porPais']
    mexp = {m['id']: m['color'] for m in data['rubros']['macro_expo']}
    mimp = {m['id']: m['color'] for m in data['rubros']['macro_impo']}

    # Último período
    all_periods = sorted({(r['anio'], r['mes']) for r in em})
    ya, ma = all_periods[-1]
    yp     = ya - 1

    # Mes actual
    emes  = sum_mes(em, ya, ma)
    imes  = sum_mes(im, ya, ma)
    emes_ = sum_mes(em, yp, ma)
    imes_ = sum_mes(im, yp, ma)
    yoy_em = yoy(emes, emes_)
    yoy_im = yoy(imes, imes_)

    # YTD
    eytd   = sum_ytd(em, ya, ma)
    iytd   = sum_ytd(im, ya, ma)
    eytd_  = sum_ytd(em, yp, ma)
    iytd_  = sum_ytd(im, yp, ma)
    yoy_ey = yoy(eytd, eytd_)
    yoy_iy = yoy(iytd, iytd_)

    # Rubros expo YTD
    ry     = rubros_ytd(er, ya, ma)   # [(rubro, {valor,peso,macro})]
    ry_ant = dict(rubros_ytd(er, yp, ma))

    # Rubros impo YTD
    iy_    = rubros_ytd(ir, ya, ma)
    iy_ant = dict(rubros_ytd(ir, yp, ma))

    # Países expo YTD
    py     = paises_ytd(ep, ya, ma)
    py_ant = dict(paises_ytd(ep, yp, ma, top=50))

    # Serie mensual (trend) — todos los datos ordenados
    em_d = {(r['anio'],r['mes']): r['valor'] for r in em}
    im_d = {(r['anio'],r['mes']): r['valor'] for r in im}
    perds = sorted(set(list(em_d.keys()) + list(im_d.keys())))
    trend = []
    for (a, m) in perds:
        e = em_d.get((a,m), 0)
        i = im_d.get((a,m), 0)
        trend.append((f"{a}-{m:02d}", round(e/1e6, 1), round(i/1e6, 1)))

    return dict(
        ya=ya, ma=ma, yp=yp,
        emes=emes, imes=imes, bal_mes=emes-imes,
        yoy_em=yoy_em, yoy_im=yoy_im,
        eytd=eytd, iytd=iytd, bal_ytd=eytd-iytd,
        eytd_=eytd_, iytd_=iytd_,
        yoy_ey=yoy_ey, yoy_iy=yoy_iy,
        ry=ry, ry_ant=ry_ant,
        iy_=iy_, iy_ant=iy_ant,
        py=py, py_ant=py_ant,
        mexp=mexp, mimp=mimp,
        trend=trend, ptxt=periodo_txt(ma, ya)
    )

# ── Secciones HTML ────────────────────────────────────────────────────────────
CSS = '''
  :root{--bg:#08111A;--paper:#0D1829;--ink:#E8F4F0;--ink2:#8BB0D4;--muted:#4A6A8A;--accent:#3B82F6;--accent-d:#2563EB;--accent-l:#FBBC44;--red:#FF5A5A;--green:#4ADE80;--amber:#FBBC44;--teal:#2DD4BF;--lila:#A78BFA;--navbar:#01050C}
  *{box-sizing:border-box;margin:0;padding:0}
  html{background:var(--bg);scroll-behavior:smooth}
  body{font-family:'IBM Plex Sans',sans-serif;font-size:16px;line-height:1.72;background:var(--bg);color:var(--ink);overflow-x:hidden}
  .masthead{background:#040C14;position:relative;overflow:hidden;padding:80px 0 60px}
  .masthead::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(59,130,246,.05) 0px,rgba(59,130,246,.05) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(0deg,rgba(59,130,246,.05) 0px,rgba(59,130,246,.05) 1px,transparent 1px,transparent 60px)}
  .masthead::after{content:'';position:absolute;top:-40px;right:-80px;width:500px;height:500px;background:radial-gradient(ellipse at center,rgba(59,130,246,.08) 0%,transparent 70%);pointer-events:none}
  .masthead-inner{max-width:1100px;margin:0 auto;padding:0 32px;position:relative;z-index:1}
  .masthead-badge{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent-l);margin-bottom:18px;display:flex;align-items:center;gap:10px}
  .masthead-badge::before{content:'';width:28px;height:1px;background:var(--accent-l)}
  .masthead h1{font-family:'Libre Baskerville',serif;font-size:clamp(32px,4.5vw,60px);font-weight:700;line-height:1.06;color:#fff;letter-spacing:-.02em}
  .masthead h1 em{font-style:italic;color:var(--accent-l);font-weight:400}
  .masthead-deck{font-size:15px;color:rgba(139,176,212,.7);font-weight:300;margin-top:18px;line-height:1.7;max-width:480px}
  .masthead-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(59,130,246,.1);margin-top:50px;max-width:640px}
  .mstat{background:rgba(4,12,20,.9);padding:22px 20px}
  .mstat-label{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent-l);margin-bottom:6px}
  .mstat-value{font-family:'Libre Baskerville',serif;font-size:34px;font-weight:700;color:#E8F4F0;line-height:1}
  .mstat-unit{font-size:12px;color:rgba(139,176,212,.5);margin-top:3px}
  .topnav{background:var(--navbar);overflow-x:auto;scrollbar-width:none;position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(59,130,246,.08)}
  .topnav::-webkit-scrollbar{display:none}
  .topnav-inner{display:flex;max-width:1100px;margin:0 auto}
  .topnav a{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);text-decoration:none;padding:13px 20px;white-space:nowrap;border-right:1px solid rgba(59,130,246,.08);transition:all .18s;cursor:pointer;border-bottom:2px solid transparent}
  .topnav a:hover{background:rgba(59,130,246,.06);color:var(--accent)}
  .topnav a.active{color:var(--accent-l);border-bottom-color:var(--accent-l)}
  .section{max-width:1100px;margin:0 auto;padding:64px 32px}
  .sec-header{display:grid;grid-template-columns:56px 1fr;gap:20px;align-items:start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid var(--accent)}
  .sec-num{font-family:'Libre Baskerville',serif;font-size:54px;font-weight:700;color:rgba(59,130,246,.18);line-height:1}
  .sec-kicker{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:7px}
  .sec-title{font-family:'Libre Baskerville',serif;font-size:28px;font-weight:700;line-height:1.15;color:#E8F4F0}
  .sec-intro{font-size:15px;color:var(--ink2);font-weight:300;line-height:1.75;margin-bottom:32px;max-width:740px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:32px}
  .stat-card{background:var(--paper);border:1px solid rgba(59,130,246,.12);padding:22px 20px;position:relative}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent)}
  .stat-card.amber::before{background:var(--amber)}.stat-card.green::before{background:var(--green)}.stat-card.red::before{background:var(--red)}.stat-card.teal::before{background:var(--teal)}.stat-card.lila::before{background:var(--lila)}
  .sc-label{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;line-height:1.5}
  .stat-card.amber .sc-label{color:var(--amber)}.stat-card.green .sc-label{color:var(--green)}.stat-card.red .sc-label{color:var(--red)}.stat-card.teal .sc-label{color:var(--teal)}.stat-card.lila .sc-label{color:var(--lila)}
  .sc-val{font-family:'Libre Baskerville',serif;font-size:34px;font-weight:700;line-height:1;color:#E8F4F0}
  .sc-unit{font-size:12px;color:var(--muted);margin-top:4px}
  .sc-delta{font-family:'IBM Plex Mono',monospace;font-size:12px;margin-top:10px}
  .d-up{color:var(--green)}.d-down{color:var(--red)}.d-warn{color:var(--amber)}
  .chart-box{background:var(--paper);border:1px solid rgba(59,130,246,.1);padding:28px;margin:24px 0}
  .chart-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px}
  .chart-ttl{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}
  .chart-sub{font-size:13px;color:var(--muted)}
  .bar-row-ext{display:grid;grid-template-columns:200px 1fr 72px 54px 70px;align-items:center;gap:10px;margin-bottom:8px}
  .bar-label{font-size:13px;color:var(--ink2);text-align:right;line-height:1.3}
  .bar-track{background:rgba(255,255,255,.04);height:20px;position:relative;overflow:hidden;border-radius:1px}
  .bar-fill{height:100%;transition:width .4s ease}
  .bar-num{font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--ink2);text-align:right}
  .bar-pond{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);text-align:right}
  .bar-var-up{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--green);text-align:right}
  .bar-var-dn{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--red);text-align:right}
  .col-hdr{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);text-align:right}
  .expl-def{background:rgba(59,130,246,.05);border:1px solid rgba(59,130,246,.14);border-left:3px solid var(--accent);padding:20px 24px;margin-bottom:12px}
  .expl-def .def-titulo{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
  .expl-def p{color:var(--ink2);font-size:14px;margin:0;font-weight:300;line-height:1.7}
  .expl-def p strong{color:#E8F4F0;font-weight:500}
  .expl-dato{background:rgba(251,188,68,.06);border:1px solid rgba(251,188,68,.18);border-left:3px solid var(--amber);padding:20px 24px;margin-bottom:12px}
  .expl-dato .def-titulo{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--amber);margin-bottom:6px}
  .expl-dato p{color:var(--ink2);font-size:14px;margin:0;font-weight:300;line-height:1.7}
  .expl-dato p strong{color:#E8F4F0;font-weight:500}
  .expl-alerta{background:rgba(255,90,90,.05);border:1px solid rgba(255,90,90,.18);border-left:3px solid var(--red);padding:20px 24px;margin-bottom:12px}
  .expl-alerta .def-titulo{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--red);margin-bottom:6px}
  .expl-alerta p{color:var(--ink2);font-size:14px;margin:0;font-weight:300;line-height:1.7}
  .expl-alerta p strong{color:#E8F4F0;font-weight:500}
  .sec-divider{height:1px;background:rgba(59,130,246,.08);max-width:1100px;margin:0 auto}
  footer{background:var(--navbar);border-top:1px solid rgba(59,130,246,.08);padding:32px;text-align:center}
  footer p{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:.08em}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .pulse{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s ease-in-out infinite;margin-right:6px}
  #lineTooltip{position:absolute;background:rgba(13,24,41,.96);border:1px solid rgba(59,130,246,.25);padding:10px 14px;font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.7;color:var(--ink2);pointer-events:none;display:none;border-radius:2px}
  @media(max-width:720px){.bar-row-ext{grid-template-columns:110px 1fr 58px 42px 58px;gap:6px}.cards{grid-template-columns:1fr 1fr}.masthead-stats{grid-template-columns:1fr}}
  @media(max-width:480px){.cards{grid-template-columns:1fr}.sec-header{grid-template-columns:40px 1fr}.sec-num{font-size:40px}}
'''

def sec_resumen(c):
    em_s  = fmt_m(c['emes'])
    im_s  = fmt_m(c['imes'])
    bal_s = fmt_bal(c['bal_mes'])
    bal_c = 'var(--red)' if c['bal_mes'] < 0 else 'var(--green)'
    ey_s  = f"{c['eytd']/1e6:.0f}"
    iy_s  = f"{c['iytd']/1e6:.0f}"
    by_s  = fmt_bal(c['bal_ytd'])
    by_c  = 'var(--red)' if c['bal_ytd'] < 0 else 'var(--green)'
    ey_d  = f"{arrow(c['yoy_ey'])} {clamp_yoy(c['yoy_ey'])} vs. {c['ptxt'].replace(str(c['ya']),str(c['yp']))}"
    iy_d  = f"{arrow(c['yoy_iy'])} {clamp_yoy(c['yoy_iy'])} vs. mismo período {c['yp']}"
    em_d  = f"{arrow(c['yoy_em'])} {clamp_yoy(c['yoy_em'])} vs. {MESES_L[c['ma']].lower()} {c['yp']}"
    im_d  = f"{arrow(c['yoy_im'])} {clamp_yoy(c['yoy_im'])} vs. {MESES_L[c['ma']].lower()} {c['yp']}"
    bal_txt = "déficit" if c['bal_mes'] < 0 else "superávit"
    return f'''<section class="section" id="resumen">
  <div class="sec-header"><div class="sec-num">01</div><div>
    <div class="sec-kicker">Panorama general</div>
    <div class="sec-title">¿Qué pasó en {MESES_L[c['ma']].lower()} de {c['ya']}?</div>
  </div></div>
  <p class="sec-intro">En {MESES_L[c['ma']].lower()} de {c['ya']}, Uruguay exportó
    <strong>USD {em_s} millones</strong> e importó <strong>USD {im_s} millones</strong>,
    resultando en un {bal_txt} comercial de USD {abs(c['bal_mes'])//1_000_000:.0f} millones.
    En el acumulado {c['ptxt']}, las exportaciones totalizan
    <strong>USD {ey_s} millones</strong> ({clamp_yoy(c['yoy_ey'])} interanual).
  </p>
  <div class="cards">
    <div class="stat-card green">
      <div class="sc-label">Exportaciones — {MESES_L[c['ma']]} {c['ya']}</div>
      <div class="sc-val">{em_s}</div>
      <div class="sc-unit">millones de dólares (FOB)</div>
      <div class="sc-delta {cls_dir(c['yoy_em'])}">{em_d}</div>
    </div>
    <div class="stat-card red">
      <div class="sc-label">Importaciones — {MESES_L[c['ma']]} {c['ya']}</div>
      <div class="sc-val">{im_s}</div>
      <div class="sc-unit">millones de dólares (CIF)</div>
      <div class="sc-delta {cls_dir(c['yoy_im'])}">{im_d}</div>
    </div>
    <div class="stat-card amber">
      <div class="sc-label">Balance comercial</div>
      <div class="sc-val" style="color:{bal_c}">{bal_s}</div>
      <div class="sc-unit">millones de dólares</div>
      <div class="sc-delta d-warn">Mes de {MESES_L[c['ma']].lower()} {c['ya']}</div>
    </div>
    <div class="stat-card teal">
      <div class="sc-label">Acumulado {c['ptxt']}</div>
      <div class="sc-val">{ey_s}</div>
      <div class="sc-unit">millones USD exportados</div>
      <div class="sc-delta {cls_dir(c['yoy_ey'])}">{arrow(c['yoy_ey'])} {clamp_yoy(c['yoy_ey'])} vs. igual período {c['yp']}</div>
    </div>
  </div>
  <div class="expl-def">
    <div class="def-titulo">¿Qué es el balance comercial?</div>
    <p>Es la diferencia entre lo que Uruguay <strong>vende al exterior (exportaciones)</strong> y lo que <strong>compra del exterior (importaciones)</strong>. Cuando importamos más de lo que exportamos, hay un <strong>déficit comercial</strong>.</p>
  </div>
</section>'''

def sec_exportaciones(c):
    ptxt = c['ptxt']
    ry   = c['ry'][:15]   # top 15
    ant  = c['ry_ant']
    eytd = c['eytd']
    mexp = c['mexp']

    # max value para barras
    max_v = max((v['valor'] for _, v in ry), default=1)
    max_m = max_v / 1e6

    # incidencias
    eytd_ant = c['eytd_']
    total_yoy = yoy(eytd, eytd_ant)

    bars  = ''
    rows  = ''
    st10  = 0.0
    top4_cards = []
    COLORS = ['#2DD4BF','#4ADE80','#FBBC44','#A78BFA','#60A5FA','#F97316','#EF4444','#8B5CF6','#34D399','#93C5FD']

    for i, (rub, v) in enumerate(ry):
        vm   = v['valor'] / 1e6
        pct_v = v['valor'] / eytd * 100 if eytd else 0
        ant_v = ant.get(rub, {}).get('valor', 0)
        yv    = yoy(v['valor'], ant_v)
        col   = mexp.get(v['macro'], COLORS[i % len(COLORS)])
        bars += bar_expo(rub, vm, pct_v, yv, max_m, col) + '\n'
        incid = (v['valor']/eytd - (ant_v/eytd_ant if eytd_ant else 0)) * 100 if eytd and eytd_ant else 0
        rows += table_row_expo(rub, col, vm, pct_v, yv, incid) + '\n'
        if i < 4:
            top4_cards.append((rub, vm, pct_v, yv, col))
        if i < 10:
            st10 += vm

    sub10 = sum(v['valor'] for _, v in ry[:10]) / eytd * 100 if eytd else 0

    cards_html = ''
    card_cls = ['teal','green','amber','lila']
    for i, (rub, vm, pct_v, yv, col) in enumerate(top4_cards):
        ar = arrow(yv) if yv is not None else ''
        dc = cls_dir(yv)
        cards_html += f'''    <div class="stat-card {card_cls[i]}">
      <div class="sc-label">{rub[:30]} · {pct_v:.1f}% del total</div>
      <div class="sc-val">{fmt_sign(yv) if yv is not None else "n/d"}</div>
      <div class="sc-unit">Var. YTD · USD {vm:.1f}M</div>
      <div class="sc-delta {dc}">{ar} {rub[:20]}</div>
    </div>\n'''

    # Total row
    ty_s = clamp_yoy(total_yoy)
    ty_c = color_dir(total_yoy)

    return f'''<section class="section" id="exportaciones">
  <div class="sec-header"><div class="sec-num">02</div><div>
    <div class="sec-kicker">Criterio Aduana · datos DNA</div>
    <div class="sec-title">Lo que Uruguay vende al mundo</div>
  </div></div>
  <p class="sec-intro">
    En el acumulado <strong>{ptxt}</strong> las exportaciones totalizaron
    <strong>USD {eytd/1e6:.0f}M</strong>
    ({clamp_yoy(total_yoy)} vs igual período {c['yp']}), según Dirección Nacional de Aduanas.
  </p>
  <div class="chart-box">
    <div class="chart-header"><div>
      <div class="chart-ttl">¿Qué exporta Uruguay?</div>
      <div class="chart-sub">Principales rubros · YTD {ptxt} · millones USD</div>
    </div></div>
    <div style="display:grid;grid-template-columns:200px 1fr 72px 62px 70px;gap:10px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(139,176,212,.1)">
      <div></div><div></div>
      <div class="col-hdr">Mill. USD</div>
      <div class="col-hdr">Peso YTD</div>
      <div class="col-hdr">Var. YTD</div>
    </div>
{bars}
    <p style="font-size:12px;color:var(--muted);margin-top:16px;font-family:'IBM Plex Mono',monospace">Fuente: DNA · Criterio aduanero · YTD {ptxt} vs igual período {c['yp']}</p>
  </div>
  <div class="cards" style="margin-top:24px">
{cards_html}  </div>
  <div style="background:var(--paper);border:1px solid rgba(59,130,246,.15);margin-top:4px;padding:22px 24px">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:16px">Resumen consolidado · YTD {ptxt} vs igual período {c['yp']}</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:480px">
        <thead><tr style="border-bottom:1px solid rgba(139,176,212,.15)">
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 0;text-align:left">Rubro</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">Mill. USD YTD</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">Peso YTD</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">Var. YTD</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 0;text-align:right">Incidencia</th>
        </tr></thead>
        <tbody>
{rows}
          <tr><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;text-transform:uppercase;color:var(--accent-l);padding:13px 0 6px;border-top:2px solid rgba(251,188,68,.3);font-weight:500">Subtotal top 10</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent-l);padding:13px 12px 6px;border-top:2px solid rgba(251,188,68,.3);text-align:right;font-weight:500">{st10:.0f}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--accent-l);padding:13px 12px 6px;border-top:2px solid rgba(251,188,68,.3);text-align:right;font-weight:500">{sub10:.1f}%</td>
            <td colspan="2" style="border-top:2px solid rgba(251,188,68,.3)"></td></tr>
          <tr style="background:rgba(59,130,246,.05)"><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;text-transform:uppercase;color:#E8F4F0;padding:13px 0 6px;border-top:2px solid rgba(59,130,246,.3);font-weight:500">Total exportaciones</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#E8F4F0;padding:13px 12px 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">{eytd/1e6:.1f}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#E8F4F0;padding:13px 12px 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">100,0%</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:{ty_c};padding:13px 12px 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">{ty_s}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:{ty_c};padding:13px 0 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">{ty_s}</td></tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:11px;color:var(--muted);font-family:'IBM Plex Mono',monospace;margin-top:12px">Incidencia = contribución al crecimiento total YTD. Fuente: DNA.</p>
  </div>
</section>'''

def sec_importaciones(c):
    ptxt = c['ptxt']
    iy   = c['iy_'][:15]
    ant  = c['iy_ant']
    iytd = c['iytd']
    mimp = c['mimp']
    iytd_ant = c['iytd_']

    max_v = max((v['valor'] for _, v in iy), default=1)
    max_m = max_v / 1e6

    COLORS = ['#EF4444','#F97316','#3B82F6','#8B5CF6','#FBBC44','#10B981','#06B6D4','#EC4899','#84CC16','#F43F5E']

    bars = ''
    rows = ''
    for i, (rub, v) in enumerate(iy):
        vm    = v['valor'] / 1e6
        pct_v = v['valor'] / iytd * 100 if iytd else 0
        ant_v = ant.get(rub, {}).get('valor', 0)
        yv    = yoy(v['valor'], ant_v)
        col   = mimp.get(v['macro'], COLORS[i % len(COLORS)])
        incid = (v['valor']/iytd - (ant_v/iytd_ant if iytd_ant else 0)) * 100 if iytd and iytd_ant else 0
        bars += bar_expo(rub, vm, pct_v, yv, max_m, col) + '\n'
        rows += table_row_expo(rub, col, vm, pct_v, yv, incid) + '\n'

    total_yoy = yoy(iytd, iytd_ant)
    ty_s = clamp_yoy(total_yoy)
    ty_c = color_dir(total_yoy)

    return f'''<section class="section" id="importaciones">
  <div class="sec-header"><div class="sec-num">03</div><div>
    <div class="sec-kicker">Criterio Aduana · datos DNA · valor CIF</div>
    <div class="sec-title">Lo que Uruguay compra al mundo</div>
  </div></div>
  <p class="sec-intro">
    Las importaciones acumuladas en <strong>{ptxt}</strong> totalizaron
    <strong>USD {iytd/1e6:.0f}M</strong>
    ({clamp_yoy(total_yoy)} vs igual período {c['yp']}).
  </p>
  <div class="chart-box">
    <div class="chart-header"><div>
      <div class="chart-ttl">¿Qué importa Uruguay?</div>
      <div class="chart-sub">Principales rubros · YTD {ptxt} · millones USD</div>
    </div></div>
    <div style="display:grid;grid-template-columns:200px 1fr 72px 62px 70px;gap:10px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(139,176,212,.1)">
      <div></div><div></div>
      <div class="col-hdr">Mill. USD</div>
      <div class="col-hdr">Peso YTD</div>
      <div class="col-hdr">Var. YTD</div>
    </div>
{bars}
    <p style="font-size:12px;color:var(--muted);margin-top:16px;font-family:'IBM Plex Mono',monospace">Fuente: DNA · CIF · YTD {ptxt}</p>
  </div>
  <div style="background:var(--paper);border:1px solid rgba(59,130,246,.15);margin-top:24px;padding:22px 24px">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:16px">Resumen consolidado · YTD {ptxt}</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:480px">
        <thead><tr style="border-bottom:1px solid rgba(139,176,212,.15)">
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 0;text-align:left">Rubro</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">Mill. USD</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">Peso YTD</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">Var. YTD</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 0;text-align:right">Incidencia</th>
        </tr></thead>
        <tbody>
{rows}
          <tr style="background:rgba(59,130,246,.05)"><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;text-transform:uppercase;color:#E8F4F0;padding:13px 0 6px;border-top:2px solid rgba(59,130,246,.3);font-weight:500">Total importaciones</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#E8F4F0;padding:13px 12px 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">{iytd/1e6:.1f}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#E8F4F0;padding:13px 12px 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">100,0%</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:{ty_c};padding:13px 12px 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">{ty_s}</td>
            <td style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:{ty_c};padding:13px 0 6px;border-top:2px solid rgba(59,130,246,.3);text-align:right;font-weight:500">{ty_s}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>'''

def sec_socios(c):
    ptxt = c['ptxt']
    py   = c['py']
    ant  = c['py_ant']
    eytd = c['eytd']
    if not py: return ''
    max_v = py[0][1]
    rows  = ''
    for pais, valor in py:
        vm    = valor / 1e6
        pct_v = valor / eytd * 100 if eytd else 0
        ant_v = ant.get(pais, 0)
        yv    = yoy(valor, ant_v)
        wp    = round(valor / max_v * 96) if max_v else 0
        rows += pais_bar(pais, vm, pct_v, wp, yv) + '\n'

    return f'''<section class="section" id="socios">
  <div class="sec-header"><div class="sec-num">04</div><div>
    <div class="sec-kicker">Destinos de exportación</div>
    <div class="sec-title">¿A quién le vende Uruguay?</div>
  </div></div>
  <p class="sec-intro">Principales destinos de exportación · YTD {ptxt} · millones USD</p>
  <div class="chart-box">
    <div class="chart-header"><div>
      <div class="chart-ttl">Destinos de exportación</div>
      <div class="chart-sub">YTD {ptxt} · millones USD · incluye ZF internas</div>
    </div></div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid rgba(139,176,212,.2)">
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 0;text-align:left">País</th>
          <th style="padding:8px 12px;min-width:100px"></th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">Mill. USD</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 12px;text-align:right">% total</th>
          <th style="font-family:'IBM Plex Mono',monospace;font-size:9px;text-transform:uppercase;color:var(--muted);font-weight:400;padding:8px 0;text-align:right">Var. YTD</th>
        </tr></thead>
        <tbody>
{rows}
        </tbody>
      </table>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:8px;font-family:'IBM Plex Mono',monospace">Fuente: DNA · Criterio aduanero</p>
  </div>
</section>'''

def sec_tendencia(c):
    trend  = c['trend']
    data_js = ','.join(f'["{m}",{e},{i}]' for m,e,i in trend)
    n      = len(trend)
    ya, ma = c['ya'], c['ma']
    # Build x-label positions (every Jan + last point)
    xlabels_js = ''
    for idx, (mo, _, _) in enumerate(trend):
        yy, mm = mo.split('-')
        if mm == '01':
            xlabels_js += f'[[{idx},"Ene {yy}"],'
        if idx == n-1:
            xlabels_js += f'[{idx},"{MESES[int(mm)]} {yy}"],'
    xlabels_js = xlabels_js.rstrip(',')

    return f'''<section class="section" id="tendencia">
  <div class="sec-header"><div class="sec-num">05</div><div>
    <div class="sec-kicker">Serie mensual</div>
    <div class="sec-title">Tendencia del comercio exterior</div>
  </div></div>
  <p class="sec-intro">Evolución mensual de exportaciones e importaciones · millones de USD · datos DNA Aduanas.</p>
  <div class="chart-box" style="position:relative">
    <div class="chart-header"><div>
      <div class="chart-ttl">Exportaciones vs Importaciones</div>
      <div class="chart-sub">Valores mensuales · millones USD</div>
    </div>
    <div style="display:flex;gap:16px;align-items:center">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--teal);display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:22px;height:2px;background:var(--teal)"></span>Expo</span>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--red);display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:22px;height:2px;background:var(--red);border-top:2px dashed var(--red)"></span>Impo</span>
    </div></div>
    <div id="lineTooltip"></div>
    <canvas id="lineChart" style="width:100%"></canvas>
  </div>
  <script>
  (function(){{
    const data = [{data_js}];
    const xLabels = [{xlabels_js}];
    function drawLineChart() {{
      const canvas = document.getElementById('lineChart');
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.offsetWidth;
      const H = 260;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const PAD = {{l:52,r:44,t:16,b:30}};
      const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
      const vals = data.flatMap(([,e,i]) => [e,i]);
      const YMAX = Math.ceil(Math.max(...vals) / 200) * 200;
      const n = data.length;
      const toX = i => PAD.l + (i/(n-1))*pw;
      const toY = v => PAD.t + ph - (v/YMAX)*ph;
      const gridVals = [0, YMAX*0.25, YMAX*0.5, YMAX*0.75, YMAX].map(v => Math.round(v/100)*100);
      gridVals.forEach(v => {{
        const y = toY(v);
        ctx.strokeStyle='rgba(139,176,212,0.08)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(PAD.l+pw,y); ctx.stroke();
        ctx.fillStyle='rgba(139,176,212,0.5)';
        ctx.font="10px 'IBM Plex Mono',monospace"; ctx.textAlign='right';
        ctx.fillText(v>=1000?(v/1000).toFixed(1)+'k':v, PAD.l-6, y+3);
      }});
      xLabels.forEach(([i,lbl]) => {{
        ctx.fillStyle = i===n-1 ? '#FBBC44' : 'rgba(139,176,212,0.5)';
        ctx.font="10px 'IBM Plex Mono',monospace"; ctx.textAlign='center';
        if(i < n) ctx.fillText(lbl, toX(i), H-6);
      }});
      ctx.beginPath(); ctx.setLineDash([5,3]); ctx.strokeStyle='#FF5A5A'; ctx.lineWidth=2;
      data.forEach(([,e,im],i) => i===0 ? ctx.moveTo(toX(i),toY(im)) : ctx.lineTo(toX(i),toY(im)));
      ctx.stroke();
      ctx.beginPath(); ctx.setLineDash([]); ctx.strokeStyle='#2DD4BF'; ctx.lineWidth=2;
      data.forEach(([,e],i) => i===0 ? ctx.moveTo(toX(i),toY(e)) : ctx.lineTo(toX(i),toY(e)));
      ctx.stroke();
      const lx=toX(n-1);
      [[toY(data[n-1][1]),'#2DD4BF'],[toY(data[n-1][2]),'#FF5A5A']].forEach(([ly,col]) => {{
        ctx.beginPath(); ctx.arc(lx,ly,4,0,Math.PI*2);
        ctx.fillStyle=col; ctx.fill(); ctx.strokeStyle='#0D1829'; ctx.lineWidth=1.5; ctx.setLineDash([]); ctx.stroke();
      }});
    }}
    drawLineChart();
    window.addEventListener('resize', drawLineChart);
    const lineCanvas = document.getElementById('lineChart');
    const tooltip = document.getElementById('lineTooltip');
    if(lineCanvas && tooltip) {{
      lineCanvas.addEventListener('mousemove', function(e) {{
        const rect=lineCanvas.getBoundingClientRect(), mx=e.clientX-rect.left;
        const W=lineCanvas.offsetWidth, PL=52, PR=44, n=data.length;
        const pw=W-PL-PR, idx=Math.round(((mx-PL)/pw)*(n-1));
        if(idx<0||idx>=n){{tooltip.style.display='none';return;}}
        const [mo,exp,imp]=data[idx];
        const bal=(exp-imp).toFixed(1), balSign=bal>=0?'+':'';
        const [yyyy,mm]=mo.split('-');
        const mes=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+mm];
        tooltip.innerHTML=`<span style="color:#8BB0D4;font-size:10px">${{mes}} ${{yyyy}}</span><br>`+
          `<span style="color:#2DD4BF">▲ Exp</span>  <strong>${{exp.toFixed(1)}}</strong> M USD<br>`+
          `<span style="color:#FF5A5A">▼ Imp</span>  <strong>${{imp.toFixed(1)}}</strong> M USD<br>`+
          `<span style="color:${{+bal>=0?'#4ADE80':'#FF5A5A'}}">= Bal</span>  <strong>${{balSign}}${{bal}}</strong> M USD`;
        const lx=PL+(idx/(n-1))*(W-PL-PR)+PL;
        tooltip.style.left=(lx+12+140>W?lx-155:lx+12)+'px';
        tooltip.style.top='10px'; tooltip.style.display='block';
      }});
      lineCanvas.addEventListener('mouseleave',()=>{{tooltip.style.display='none';}});
    }}
  }})();
  </script>
</section>'''

# ── Generador principal ───────────────────────────────────────────────────────
def generate(c):
    ya, ma = c['ya'], c['ma']
    em_s = fmt_m(c['emes'])
    im_s = fmt_m(c['imes'])
    bal_s = fmt_bal(c['bal_mes'])
    bal_c = 'var(--red)' if c['bal_mes'] < 0 else 'var(--green)'
    today = date.today().strftime('%d/%m/%Y')

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Comercio Exterior Uruguay · {MESES_L[ma]} {ya}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
{CSS}
</style>
</head>
<body>

<div class="masthead">
  <div class="masthead-inner">
    <div class="masthead-badge"><span class="pulse"></span>Datos actualizados a {MESES_L[ma].lower()} {ya}</div>
    <h1>Comercio Exterior<br><em>Uruguay</em></h1>
    <p class="masthead-deck">¿Cuánto vende Uruguay al mundo y cuánto compra? Este reporte explica en términos simples el estado del comercio internacional del país.</p>
    <div class="masthead-stats">
      <div class="mstat">
        <div class="mstat-label">Exportaciones · {MESES[ma]} {ya}</div>
        <div class="mstat-value">{em_s}</div>
        <div class="mstat-unit">millones de USD (FOB)</div>
      </div>
      <div class="mstat">
        <div class="mstat-label">Importaciones · {MESES[ma]} {ya}</div>
        <div class="mstat-value">{im_s}</div>
        <div class="mstat-unit">millones de USD (CIF)</div>
      </div>
      <div class="mstat">
        <div class="mstat-label">Balance comercial</div>
        <div class="mstat-value" style="color:{bal_c}">{bal_s}</div>
        <div class="mstat-unit">millones de USD</div>
      </div>
    </div>
  </div>
</div>

<nav class="topnav">
  <div class="topnav-inner">
    <a href="#resumen" class="active">Resumen</a>
    <a href="#exportaciones">Exportaciones</a>
    <a href="#importaciones">Importaciones</a>
    <a href="#socios">Socios Comerciales</a>
    <a href="#tendencia">Tendencia</a>
  </div>
</nav>

{sec_resumen(c)}
<div class="sec-divider"></div>
{sec_exportaciones(c)}
<div class="sec-divider"></div>
{sec_importaciones(c)}
<div class="sec-divider"></div>
{sec_socios(c)}
<div class="sec-divider"></div>
{sec_tendencia(c)}

<footer>
  <p>Comercio Exterior Uruguay · {MESES_L[ma]} {ya} · Fuente: Dirección Nacional de Aduanas</p>
  <p style="margin-top:6px">Generado automáticamente · {today} · ceterisparibus.uy</p>
</footer>

<script>
  // Nav scroll spy
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.topnav a');
  window.addEventListener('scroll', () => {{
    let cur = '';
    sections.forEach(s => {{ if (window.scrollY >= s.offsetTop - 80) cur = s.id; }});
    navLinks.forEach(a => {{ a.classList.toggle('active', a.getAttribute('href') === '#'+cur); }});
  }}, {{passive: true}});
  // Animate bars on scroll
  const bars = document.querySelectorAll('.bar-fill');
  const obs = new IntersectionObserver(entries => {{
    entries.forEach(e => {{
      if (e.isIntersecting) {{
        const w = e.target.style.width;
        e.target.style.width = '0%';
        setTimeout(() => {{ e.target.style.transition='width .8s cubic-bezier(.4,0,.2,1)'; e.target.style.width=w; }}, 100);
        obs.unobserve(e.target);
      }}
    }});
  }}, {{threshold: 0.1}});
  bars.forEach(b => obs.observe(b));
</script>
</body>
</html>'''

def main():
    print('Leyendo datos...')
    data = json.loads(JSON_FILE.read_text('utf-8'))
    print('Computando métricas...')
    c = compute(data)
    print(f'  Período: {MESES_L[c["ma"]]} {c["ya"]}')
    print(f'  Expo mes: USD {c["emes"]/1e6:.1f}M | Impo: USD {c["imes"]/1e6:.1f}M')
    print(f'  YTD expo: USD {c["eytd"]/1e6:.0f}M | YTD impo: USD {c["iytd"]/1e6:.0f}M')
    print('Generando HTML...')
    html = generate(c)
    OUT_HTML.write_text(html, encoding='utf-8')
    sz = OUT_HTML.stat().st_size // 1024
    print(f'✅ Guardado: {OUT_HTML.name} ({sz} KB)')

if __name__ == '__main__':
    main()
