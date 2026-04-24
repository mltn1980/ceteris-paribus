// ============================================
// DATA-LOADER.JS - Carga de datos desde JSON
// ============================================

// Función helper para mostrar variaciones
function displayVariation(elementId, value, prefix = 'vs mes ant: ') {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (value === undefined || value === null) {
        el.style.display = 'none';
        return;
    }
    
    el.textContent = prefix + (value > 0 ? '▲ +' : '▼ ') + value + '%';
    el.style.background = value > 0 ? '#edf5ef' : '#fceaea';
    el.style.color = value > 0 ? '#2a7235' : '#a32d2d';
    el.style.display = '';
}

// ============================================
// NOVILLO - Datos INAC
// ============================================
function loadNovilloData() {
    fetch('data/novillo.json')
        .then(r => r.json())
        .then(d => {
            // Novillo Tipo principal
            document.getElementById('novillo-valor').textContent = d.valor.toLocaleString('es-UY');
            document.getElementById('novillo-periodo').textContent = 'Dato: ' + d.periodo + ' · Actualizado: ' + new Date(d.actualizado).toLocaleDateString('es-UY');
            
            // Variaciones
            displayVariation('novillo-var', d.variacion);
            displayVariation('novillo-var-año', d.variacion_año, 'vs año ant: ');
            
            // Valor Hacienda (VH)
            document.getElementById('novillo-vh').textContent = d.vh.toLocaleString('es-UY');
            displayVariation('novillo-vh-var', d.vh_variacion);
            displayVariation('novillo-vh-var-año', d.vh_variacion_año, 'vs año ant: ');
            document.getElementById('novillo-vh-pct').textContent = d.vh_participacion + '% del total';
            
            // Valor Agregado Industrial (VAI)
            document.getElementById('novillo-vai').textContent = d.vai.toLocaleString('es-UY');
            displayVariation('novillo-vai-var', d.vai_variacion);
            displayVariation('novillo-vai-var-año', d.vai_variacion_año, 'vs año ant: ');
            document.getElementById('novillo-vai-pct').textContent = d.vai_participacion + '% del total';
        })
        .catch(() => {
            // Fallback con datos de marzo 2026
            document.getElementById('novillo-valor').textContent = '1.976';
            document.getElementById('novillo-periodo').textContent = 'Dato: marzo 2026';
            displayVariation('novillo-var', 2.3);
            displayVariation('novillo-var-año', 18.3, 'vs año ant: ');
            document.getElementById('novillo-vh').textContent = '1.608';
            displayVariation('novillo-vh-var', 0.4);
            displayVariation('novillo-vh-var-año', 26.6, 'vs año ant: ');
            document.getElementById('novillo-vh-pct').textContent = '81% del total';
            document.getElementById('novillo-vai').textContent = '368';
            displayVariation('novillo-vai-var', 11.2);
            displayVariation('novillo-vai-var-año', -8.2, 'vs año ant: ');
            document.getElementById('novillo-vai-pct').textContent = '19% del total';
        });
}

// ============================================
// RHE - Contexto de mercado
// ============================================
function loadRHEContext() {
    fetch('data/rhe.json')
        .then(r => r.json())
        .then(rhe => {
            const rheNovPct = (rhe.rhe_novillo * 100).toFixed(1);
            const context = `<strong>Contexto de mercado:</strong> El productor recibe ${rheNovPct}% del precio de exportación (RHE ${rheNovPct}%). Precio export: USD ${rhe.precio_export.toFixed(2)}/kg · Novillo: USD ${rhe.precio_novillo.toFixed(2)}/kg · Semana ${rhe.periodo}.`;
            const contextEl = document.getElementById('rhe-context');
            if (contextEl) {
                contextEl.innerHTML = context;
            }
        })
        .catch(() => {
            // Fallback sin contexto RHE
            const contextEl = document.getElementById('rhe-context');
            if (contextEl) {
                contextEl.innerHTML = '';
            }
        });
}

// ============================================
// FAENA - Datos de faena y exportaciones
// ============================================
function loadFaenaData() {
    fetch('data/faena.json')
        .then(r => r.json())
        .then(d => {
            // Total y categorías
            const faenaEl = document.getElementById('faena-total');
            if (faenaEl) {
                faenaEl.textContent = d.total.toLocaleString('es-UY');
            }
            
            // Variación vs año anterior
            displayVariation('faena-var-año', d.variacion_año, 'vs año ant: ');
            
            // Ranking frigoríficos (si existe)
            const rankingEl = document.getElementById('faena-ranking');
            if (rankingEl && d.ranking) {
                let rankingHTML = '<strong>Top 5 frigoríficos:</strong><br>';
                d.ranking.slice(0, 5).forEach((f, i) => {
                    rankingHTML += `${i + 1}. ${f.nombre}: ${f.faena.toLocaleString('es-UY')} cab (${f.porcentaje}%)<br>`;
                });
                rankingEl.innerHTML = rankingHTML;
            }
        })
        .catch(() => {
            console.warn('No se pudo cargar data/faena.json');
        });
}

// ============================================
// INICIALIZACIÓN
// ============================================
// Cargar todos los datos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    loadNovilloData();
    loadRHEContext();
    loadFaenaData();
});
