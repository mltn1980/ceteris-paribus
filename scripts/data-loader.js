// ============================================
// DATA-LOADER.JS - Carga de datos desde JSON
// ============================================

document.addEventListener('DOMContentLoaded', function () {

    // ============================================
    // Utilidades
    // ============================================

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function setVariacion(id, valor, label) {
        const el = document.getElementById(id);
        if (!el) return;
        const positivo = valor > 0;
        el.textContent = label + ': ' + (positivo ? '▲ +' : '▼ ') + valor + '%';
        el.style.background = positivo ? '#edf5ef' : '#fceaea';
        el.style.color = positivo ? '#2a7235' : '#a32d2d';
    }

    function ocultarSi(id, condicion) {
        const el = document.getElementById(id);
        if (el && condicion) el.style.display = 'none';
    }

    // ============================================
    // NOVILLO - Datos INAC
    // ============================================
    fetch('data/novillo.json')
        .then(r => r.json())
        .then(d => {
            setText('novillo-valor', d.valor.toLocaleString('es-UY'));
            setText('novillo-periodo', 'Dato: ' + d.periodo + ' · Actualizado: ' + new Date(d.actualizado).toLocaleDateString('es-UY'));
            setVariacion('novillo-var', d.variacion, 'vs mes ant');

            if (d.variacion_año !== undefined) {
                setVariacion('novillo-var-año', d.variacion_año, 'vs año ant');
            } else {
                ocultarSi('novillo-var-año', true);
            }

            setText('novillo-vh', d.vh.toLocaleString('es-UY'));
            setVariacion('novillo-vh-var', d.vh_variacion, 'vs mes ant');

            if (d.vh_variacion_año !== undefined) {
                setVariacion('novillo-vh-var-año', d.vh_variacion_año, 'vs año ant');
            } else {
                ocultarSi('novillo-vh-var-año', true);
            }

            setText('novillo-vh-pct', d.vh_participacion + '% del total');
            setText('novillo-vai', d.vai.toLocaleString('es-UY'));
            setVariacion('novillo-vai-var', d.vai_variacion, 'vs mes ant');

            if (d.vai_variacion_año !== undefined) {
                setVariacion('novillo-vai-var-año', d.vai_variacion_año, 'vs año ant');
            } else {
                ocultarSi('novillo-vai-var-año', true);
            }

            setText('novillo-vai-pct', d.vai_participacion + '% del total');
        })
        .catch(() => {
            // Fallback con datos de marzo 2026
            setText('novillo-valor', '1.976');
            setText('novillo-periodo', 'Dato: marzo 2026');
            setVariacion('novillo-var', 2.3, 'vs mes ant');
            setVariacion('novillo-var-año', 18.3, 'vs año ant');
            setText('novillo-vh', '1.608');
            setVariacion('novillo-vh-var', 0.4, 'vs mes ant');
            setVariacion('novillo-vh-var-año', 26.6, 'vs año ant');
            setText('novillo-vh-pct', '81% del total');
            setText('novillo-vai', '368');
            setVariacion('novillo-vai-var', 11.2, 'vs mes ant');
            setVariacion('novillo-vai-var-año', -8.2, 'vs año ant');
            setText('novillo-vai-pct', '19% del total');
        });

    // ============================================
    // RHE - Contexto de mercado
    // ============================================
    // ============================================
    // RHE CARD - Datos completos de RHE
    // ============================================

    const semanaAnterior = {
        rhe_novillo: 0.971,
        rhe_vaca: 0.872,
        precio_novillo: 5.519,
        precio_vaca: 4.957,
        precio_export: 5.686
    };

    function formatearVariacion(valor, valorAnterior, tipo) {
        const diff = valor - valorAnterior;
        const isPositive = diff > 0;
        const arrow = isPositive ? '▲' : (diff < 0 ? '▼' : '—');
        const color = isPositive ? '#2a7235' : '#8c3030';
        const texto = tipo === 'rhe'
            ? Math.abs(diff * 100).toFixed(1) + ' pts'
            : Math.abs(diff).toFixed(2);

        return {
            html: arrow + ' ' + texto + ' vs semana anterior',
            color: diff === 0 ? '#918b80' : color
        };
    }

    function aplicarVariacion(id, varObj) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = varObj.html;
        el.style.color = varObj.color;
    }

    function cargarRHECard(d) {
        setText('rhe-novillo-pct', (d.rhe_novillo * 100).toFixed(1) + '%');
        setText('rhe-vaca-pct', (d.rhe_vaca * 100).toFixed(1) + '%');
        setText('rhe-precio-export', d.precio_export.toFixed(2));
        setText('rhe-precio-novillo', d.precio_novillo.toFixed(2));
        setText('rhe-precio-vaca', d.precio_vaca.toFixed(2));
        setText('rhe-periodo', 'Semana: ' + d.periodo + ' · Actualizado: ' + new Date(d.actualizado).toLocaleDateString('es-UY'));

        aplicarVariacion('rhe-novillo-var', formatearVariacion(d.rhe_novillo, d.rhe_novillo_anterior || semanaAnterior.rhe_novillo, 'rhe'));
        aplicarVariacion('rhe-vaca-var', formatearVariacion(d.rhe_vaca, d.rhe_vaca_anterior || semanaAnterior.rhe_vaca, 'rhe'));
        aplicarVariacion('rhe-precio-export-var', formatearVariacion(d.precio_export, d.precio_export_anterior || semanaAnterior.precio_export, 'precio'));
        aplicarVariacion('rhe-precio-novillo-var', formatearVariacion(d.precio_novillo, d.precio_novillo_anterior || semanaAnterior.precio_novillo, 'precio'));
        aplicarVariacion('rhe-precio-vaca-var', formatearVariacion(d.precio_vaca, d.precio_vaca_anterior || semanaAnterior.precio_vaca, 'precio'));
    }

    fetch('data/rhe.json')
        .then(r => r.json())
        .then(cargarRHECard)
        .catch(() => {
            const fallback = {
                rhe_novillo: 0.959,
                rhe_vaca: 0.855,
                precio_novillo: 5.515,
                precio_vaca: 4.918,
                precio_export: 5.750,
                periodo: '12-18 abril 2026',
                actualizado: new Date().toISOString()
            };
            cargarRHECard(fallback);
        });

    // ============================================
    // FAENA - Datos de faena y frigoríficos
    // ============================================
    fetch('data/faena.json')
        .then(r => r.json())
        .then(d => {
            setText('faena-total', d.total.toLocaleString('es-UY'));
            setText('faena-novillo', d.novillo.toLocaleString('es-UY'));
            setText('faena-novillo-pct', d.novillo_pct + '%');
            setText('faena-vaca', d.vaca.toLocaleString('es-UY'));
            setText('faena-vaca-pct', d.vaca_pct + '%');
            setText('faena-vaquillona', d.vaquillona.toLocaleString('es-UY'));
            setText('faena-vaquillona-pct', d.vaquillona_pct + '%');
            setText('faena-periodo', 'Período: ' + d.periodo + ' · Actualizado: ' + new Date(d.actualizado).toLocaleDateString('es-UY'));

            if (d.variacion_año !== undefined) {
                setVariacion('faena-var-año', d.variacion_año, 'vs año ant');
            } else {
                ocultarSi('faena-var-año', true);
            }

            const ranking = document.getElementById('frigo-ranking');
            if (!ranking) return;
            ranking.textContent = '';

            d.frigorificos.forEach((f, i) => {
                const bar = document.createElement('div');
                bar.style.cssText = 'display:flex;align-items:center;gap:8px;';

                const label = document.createElement('div');
                label.style.cssText = 'font-size:0.78rem;font-weight:600;color:var(--text);min-width:120px;';
                label.textContent = (i + 1) + '. ' + f.nombre;

                const barContainer = document.createElement('div');
                barContainer.style.cssText = 'flex:1;background:var(--surface2);border-radius:4px;height:20px;position:relative;overflow:hidden;';

                const barFill = document.createElement('div');
                barFill.style.cssText = 'background:var(--red);height:100%;border-radius:4px;transition:width 0.3s;width:' + f.porcentaje + '%';

                const pct = document.createElement('div');
                pct.style.cssText = 'font-size:0.75rem;font-weight:600;color:var(--text2);min-width:40px;text-align:right;';
                pct.textContent = f.porcentaje.toFixed(1) + '%';

                barContainer.appendChild(barFill);
                bar.appendChild(label);
                bar.appendChild(barContainer);
                bar.appendChild(pct);
                ranking.appendChild(bar);
            });
        })
        .catch(() => {
            console.warn('No se pudo cargar data/faena.json');
        });

    // ============================================
    // CLIMA - Monitor Climático desde clima.json
    // ============================================
    fetch('data/clima.json')
        .then(r => r.json())
        .then(c => {
            // Fecha de actualización
            if (c.actualizado) {
                const [y, m, d] = c.actualizado.split('-');
                const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
                const fechaLarga = `${parseInt(d)} de ${meses[parseInt(m)-1]} de ${y}`;
                const fechaCorta = `${parseInt(d)} ${meses[parseInt(m)-1].slice(0,3)} ${y}`;
                setText('clima-fecha-update', fechaLarga);
                setText('clima-header-fecha', 'Actualizado: ' + fechaCorta);
            }

            // Alerta meteorológica
            const alertaBox = document.getElementById('clima-alerta-box');
            if (alertaBox && c.alerta) {
                if (c.alerta.activa) {
                    document.getElementById('clima-alerta-titulo').textContent = c.alerta.titulo || '';
                    document.getElementById('clima-alerta-desc').textContent = c.alerta.descripcion || '';
                    document.getElementById('clima-alerta-vigencia').textContent = 'Vigencia: ' + (c.alerta.vigencia || '') + ' · ' + (c.alerta.fuente || '');
                    alertaBox.style.display = 'block';
                } else {
                    alertaBox.style.display = 'none';
                }
            }

            // Cards ENSO
            if (c.enso) {
                setText('clima-fase', c.enso.fase || '');
                if (c.enso.nino34 !== undefined) {
                    const signo = c.enso.nino34 >= 0 ? '+' : '';
                    setText('clima-nino34', signo + c.enso.nino34.toFixed(1).replace('.', ',') + '°C');
                }
                if (c.enso.nino34_anterior !== undefined && c.enso.nino34 !== undefined) {
                    const diff = c.enso.nino34 - c.enso.nino34_anterior;
                    const signo = diff >= 0 ? '▲ desde ' : '▼ desde ';
                    const ant = (c.enso.nino34_anterior >= 0 ? '+' : '') + c.enso.nino34_anterior.toFixed(1).replace('.', ',') + '°C';
                    const badge = document.getElementById('clima-nino34-cambio');
                    if (badge) {
                        badge.textContent = signo + ant;
                        badge.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
                        badge.style.background = diff >= 0 ? 'var(--green-l)' : 'var(--red-l)';
                    }
                }
                setText('clima-nino34-fecha', 'Semana del ' + (c.enso.nino34_semana || ''));
                setText('clima-perspectiva-pct', (c.enso.perspectiva_pct || '') + ' probabilidad · ' + (c.enso.fuente_fecha || ''));
                setText('clima-proximo-update', c.enso.proximo_update || '');

                // Nota extra (onda Kelvin, etc.)
                const notaEl = document.getElementById('clima-nota-extra');
                if (notaEl) {
                    if (c.enso.nota_extra) {
                        notaEl.textContent = c.enso.nota_extra;
                        notaEl.style.display = 'block';
                    } else {
                        notaEl.style.display = 'none';
                    }
                }
            }

            // Timeline de probabilidades
            const timeline = document.getElementById('clima-timeline');
            if (timeline && c.probabilidades && c.probabilidades.length) {
                timeline.innerHTML = '';
                c.probabilidades.forEach((p, i) => {
                    const isActual = p.actual;
                    const isLast = i === c.probabilidades.length - 1;
                    const item = document.createElement('div');
                    item.style.cssText = 'position:relative;' + (isLast ? '' : 'margin-bottom:22px;');

                    const dot = document.createElement('div');
                    dot.style.cssText = `position:absolute;left:-28px;top:4px;width:12px;height:12px;border-radius:50%;background:${isActual ? 'var(--amber)' : 'var(--surface)'};border:2px solid ${isActual ? 'var(--amber)' : (p.el_nino > 60 ? 'var(--amber)' : 'var(--border)')};`;
                    item.appendChild(dot);

                    const title = document.createElement('div');
                    title.style.cssText = 'font-size:0.88rem;font-weight:' + (isActual ? '700' : '600') + ';margin-bottom:6px;color:var(--text);';
                    title.textContent = p.label;
                    if (isActual) {
                        const badge = document.createElement('span');
                        badge.style.cssText = 'font-size:0.72rem;background:var(--amber);color:#fff;padding:2px 7px;border-radius:4px;font-weight:700;margin-left:6px;';
                        badge.textContent = 'AHORA';
                        title.appendChild(badge);
                    }
                    item.appendChild(title);

                    const desc = document.createElement('div');
                    desc.style.cssText = 'font-size:0.82rem;color:var(--text2);margin-bottom:8px;';
                    const tag = document.createElement('span');
                    tag.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:6px;background:var(--amber-l);color:var(--amber);font-size:0.75rem;font-weight:' + (isActual ? '700' : '600') + ';';
                    tag.textContent = 'El Niño';
                    desc.appendChild(tag);
                    desc.append(' ' + (p.descripcion || ''));
                    item.appendChild(desc);

                    // Barra de probabilidad
                    const barRow = document.createElement('div');
                    barRow.style.cssText = 'display:flex;gap:4px;align-items:center;font-size:0.75rem;';
                    const bNino = document.createElement('div');
                    bNino.style.cssText = `flex:${p.el_nino};background:var(--amber);height:8px;border-radius:3px 0 0 3px;`;
                    const bNeutral = document.createElement('div');
                    bNeutral.style.cssText = `flex:${p.neutral};background:var(--blue-l);height:8px;border-radius:${p.la_nina > 0 ? '0' : '0 3px 3px 0'};`;
                    barRow.appendChild(bNino);
                    barRow.appendChild(bNeutral);
                    if (p.la_nina > 0) {
                        const bNina = document.createElement('div');
                        bNina.style.cssText = `flex:${p.la_nina};background:#e8c0c0;height:8px;border-radius:0 3px 3px 0;`;
                        barRow.appendChild(bNina);
                    }
                    const label = document.createElement('span');
                    label.style.cssText = 'color:var(--text2);white-space:nowrap;margin-left:6px;';
                    label.textContent = `El Niño ${p.el_nino}% · Neutral ${p.neutral}%` + (p.la_nina > 0 ? ` · La Niña ${p.la_nina}%` : '');
                    barRow.appendChild(label);
                    item.appendChild(barRow);

                    timeline.appendChild(item);
                });
            }
        })
        .catch(() => { /* Fallback: contenido hardcodeado en HTML */ });

    // ============================================
    // TCRE - Tipo de Cambio Real Efectivo
    // ============================================
    fetch('data/tcre.json')
        .then(r => r.json())
        .then(d => {
            // Índices principales
            setText('tcre-global', d.global.toFixed(2).replace('.', ','));
            setText('tcre-extra', d.extraregional.toFixed(2).replace('.', ','));
            setText('tcre-regional', d.regional.toFixed(2).replace('.', ','));
            setText('tcre-periodo', 'Dato: ' + d.periodo + (d.preliminar ? ' (*)' : '') + ' · Base 2019=100');

            // Variaciones vs mes anterior
            function varTCRE(id, actual, anterior, etiqueta) {
                const pct = ((actual - anterior) / anterior * 100);
                const positivo = pct > 0;
                const el = document.getElementById(id);
                if (!el) return;
                el.textContent = (positivo ? '▲ +' : '▼ ') + Math.abs(pct).toFixed(1) + '% vs ' + etiqueta;
                el.style.color = positivo ? 'var(--green)' : 'var(--red)';
            }

            if (d.anterior) {
                varTCRE('tcre-global-var-m', d.global, d.anterior.global, 'mes ant');
                varTCRE('tcre-extra-var-m', d.extraregional, d.anterior.extraregional, 'mes ant');
                varTCRE('tcre-regional-var-m', d.regional, d.anterior.regional, 'mes ant');
            }
            if (d.mismo_mes_año_anterior) {
                varTCRE('tcre-global-var-a', d.global, d.mismo_mes_año_anterior.global, 'año ant');
                varTCRE('tcre-extra-var-a', d.extraregional, d.mismo_mes_año_anterior.extraregional, 'año ant');
                varTCRE('tcre-regional-var-a', d.regional, d.mismo_mes_año_anterior.regional, 'año ant');
            }

            // Socios
            const socios = { argentina: 'tcre-arg', brasil: 'tcre-bra', eeuu: 'tcre-usa', mexico: 'tcre-mex', alemania: 'tcre-deu', china: 'tcre-chn' };
            Object.entries(socios).forEach(([key, id]) => {
                const el = document.getElementById(id);
                if (!el || d[key] === undefined) return;
                el.textContent = d[key].toFixed(2).replace('.', ',');
                el.style.color = d[key] >= 100 ? 'var(--green)' : 'var(--red)';
            });
        })
        .catch(() => { /* datos hardcodeados en HTML como fallback */ });

});
