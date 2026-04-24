// ============================================
// DATA-LOADER.JS - Carga de datos desde JSON
// ============================================

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // NOVILLO - Datos INAC
    // ============================================
    fetch('data/novillo.json')
        .then(r => r.json())
        .then(d => {
            // Novillo Tipo principal
            document.getElementById('novillo-valor').textContent = d.valor.toLocaleString('es-UY');
            document.getElementById('novillo-periodo').textContent = 'Dato: ' + d.periodo + ' · Actualizado: ' + new Date(d.actualizado).toLocaleDateString('es-UY');
            
            // Variación vs mes anterior
            const varEl = document.getElementById('novillo-var');
            const v = d.variacion;
            varEl.textContent = 'vs mes ant: ' + (v > 0 ? '▲ +' : '▼ ') + v + '%';
            varEl.style.background = v > 0 ? '#edf5ef' : '#fceaea';
            varEl.style.color = v > 0 ? '#2a7235' : '#a32d2d';
            
            // Variación vs año anterior (solo si existe)
            const varAñoEl = document.getElementById('novillo-var-año');
            if (d.variacion_año !== undefined) {
                const vAño = d.variacion_año;
                varAñoEl.textContent = 'vs año ant: ' + (vAño > 0 ? '▲ +' : '▼ ') + vAño + '%';
                varAñoEl.style.background = vAño > 0 ? '#edf5ef' : '#fceaea';
                varAñoEl.style.color = vAño > 0 ? '#2a7235' : '#a32d2d';
            } else {
                varAñoEl.style.display = 'none';
            }
            
            // Valor Hacienda (VH)
            document.getElementById('novillo-vh').textContent = d.vh.toLocaleString('es-UY');
            
            // VH Variación vs mes anterior
            const vhVarEl = document.getElementById('novillo-vh-var');
            const vhV = d.vh_variacion;
            vhVarEl.textContent = 'vs mes ant: ' + (vhV > 0 ? '▲ +' : '▼ ') + vhV + '%';
            vhVarEl.style.background = vhV > 0 ? '#edf5ef' : '#fceaea';
            vhVarEl.style.color = vhV > 0 ? '#2a7235' : '#a32d2d';
            
            // VH Variación vs año anterior (solo si existe)
            const vhVarAñoEl = document.getElementById('novillo-vh-var-año');
            if (d.vh_variacion_año !== undefined) {
                const vhVAño = d.vh_variacion_año;
                vhVarAñoEl.textContent = 'vs año ant: ' + (vhVAño > 0 ? '▲ +' : '▼ ') + vhVAño + '%';
                vhVarAñoEl.style.background = vhVAño > 0 ? '#edf5ef' : '#fceaea';
                vhVarAñoEl.style.color = vhVAño > 0 ? '#2a7235' : '#a32d2d';
            } else {
                vhVarAñoEl.style.display = 'none';
            }
            
            document.getElementById('novillo-vh-pct').textContent = d.vh_participacion + '% del total';
            
            // Valor Agregado Industrial (VAI)
            document.getElementById('novillo-vai').textContent = d.vai.toLocaleString('es-UY');
            
            // VAI Variación vs mes anterior
            const vaiVarEl = document.getElementById('novillo-vai-var');
            const vaiV = d.vai_variacion;
            vaiVarEl.textContent = 'vs mes ant: ' + (vaiV > 0 ? '▲ +' : '▼ ') + vaiV + '%';
            vaiVarEl.style.background = vaiV > 0 ? '#edf5ef' : '#fceaea';
            vaiVarEl.style.color = vaiV > 0 ? '#2a7235' : '#a32d2d';
            
            // VAI Variación vs año anterior (solo si existe)
            const vaiVarAñoEl = document.getElementById('novillo-vai-var-año');
            if (d.vai_variacion_año !== undefined) {
                const vaiVAño = d.vai_variacion_año;
                vaiVarAñoEl.textContent = 'vs año ant: ' + (vaiVAño > 0 ? '▲ +' : '▼ ') + vaiVAño + '%';
                vaiVarAñoEl.style.background = vaiVAño > 0 ? '#edf5ef' : '#fceaea';
                vaiVarAñoEl.style.color = vaiVAño > 0 ? '#2a7235' : '#a32d2d';
            } else {
                vaiVarAñoEl.style.display = 'none';
            }
            
            document.getElementById('novillo-vai-pct').textContent = d.vai_participacion + '% del total';
        })
        .catch(() => {
            // Fallback con datos de marzo 2026
            document.getElementById('novillo-valor').textContent = '1.976';
            document.getElementById('novillo-periodo').textContent = 'Dato: marzo 2026';
            
            const varEl = document.getElementById('novillo-var');
            varEl.textContent = 'vs mes ant: ▲ +2,3%';
            varEl.style.background = '#edf5ef';
            varEl.style.color = '#2a7235';
            
            const varAñoEl = document.getElementById('novillo-var-año');
            varAñoEl.textContent = 'vs año ant: ▲ +18,3%';
            varAñoEl.style.background = '#edf5ef';
            varAñoEl.style.color = '#2a7235';
            
            document.getElementById('novillo-vh').textContent = '1.608';
            
            const vhVarEl = document.getElementById('novillo-vh-var');
            vhVarEl.textContent = 'vs mes ant: ▲ +0,4%';
            vhVarEl.style.background = '#edf5ef';
            vhVarEl.style.color = '#2a7235';
            
            const vhVarAñoEl = document.getElementById('novillo-vh-var-año');
            vhVarAñoEl.textContent = 'vs año ant: ▲ +26,6%';
            vhVarAñoEl.style.background = '#edf5ef';
            vhVarAñoEl.style.color = '#2a7235';
            
            document.getElementById('novillo-vh-pct').textContent = '81% del total';
            
            document.getElementById('novillo-vai').textContent = '368';
            
            const vaiVarEl = document.getElementById('novillo-vai-var');
            vaiVarEl.textContent = 'vs mes ant: ▲ +11,2%';
            vaiVarEl.style.background = '#edf5ef';
            vaiVarEl.style.color = '#2a7235';
            
            const vaiVarAñoEl = document.getElementById('novillo-vai-var-año');
            vaiVarAñoEl.textContent = 'vs año ant: ▼ -8,2%';
            vaiVarAñoEl.style.background = '#fceaea';
            vaiVarAñoEl.style.color = '#a32d2d';
            
            document.getElementById('novillo-vai-pct').textContent = '19% del total';
        });
    
    // ============================================
    // RHE - Contexto de mercado
    // ============================================
    fetch('data/rhe.json')
        .then(r => r.json())
        .then(rhe => {
            const rheNovPct = (rhe.rhe_novillo * 100).toFixed(1);
            const context = `<strong>Contexto de mercado:</strong> El productor recibe ${rheNovPct}% del precio de exportación (RHE ${rheNovPct}%). Precio export: USD ${rhe.precio_export.toFixed(2)}/kg · Novillo: USD ${rhe.precio_novillo.toFixed(2)}/kg · Semana ${rhe.periodo}.`;
            document.getElementById('novillo-rhe-context').innerHTML = context;
        })
        .catch(() => {
            // Fallback sin contexto RHE
        });
    
    // ============================================
    // FAENA - Datos de faena y frigoríficos
    // ============================================
    fetch('data/faena.json')
        .then(r => r.json())
        .then(d => {
            // Total y categorías
            document.getElementById('faena-total').textContent = d.total.toLocaleString('es-UY');
            document.getElementById('faena-novillo').textContent = d.novillo.toLocaleString('es-UY');
            document.getElementById('faena-novillo-pct').textContent = d.novillo_pct + '%';
            document.getElementById('faena-vaca').textContent = d.vaca.toLocaleString('es-UY');
            document.getElementById('faena-vaca-pct').textContent = d.vaca_pct + '%';
            document.getElementById('faena-vaquillona').textContent = d.vaquillona.toLocaleString('es-UY');
            document.getElementById('faena-vaquillona-pct').textContent = d.vaquillona_pct + '%';
            document.getElementById('faena-periodo').textContent = 'Período: ' + d.periodo + ' · Actualizado: ' + new Date(d.actualizado).toLocaleDateString('es-UY');
            
            // Variación vs año anterior
            const varAñoEl = document.getElementById('faena-var-año');
            if (d.variacion_año !== undefined) {
                const varAño = d.variacion_año;
                varAñoEl.textContent = 'vs año ant: ' + (varAño > 0 ? '▲ +' : '▼ ') + varAño + '%';
                varAñoEl.style.background = varAño > 0 ? '#edf5ef' : '#fceaea';
                varAñoEl.style.color = varAño > 0 ? '#2a7235' : '#a32d2d';
            } else {
                varAñoEl.style.display = 'none';
            }
            
            // Ranking frigoríficos
            const ranking = document.getElementById('frigo-ranking');
            ranking.innerHTML = ''; // Limpiar contenido previo
            
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
    
});
