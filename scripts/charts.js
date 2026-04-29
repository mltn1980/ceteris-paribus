// ============================================
// CHARTS.JS - Gráficos con Chart.js
// ============================================

let rheChart = null;
let showAverage = true;
let rheSerie = [];

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];

function formatFechaRHE(fechaStr) {
    const d = new Date(fechaStr + 'T00:00:00');
    return MESES[d.getMonth()] + '-' + String(d.getFullYear()).slice(2);
}

// ============================================
// GRÁFICO RHE - Relación Hacienda Export
// ============================================
function buildRHEChart() {
    const ctx = document.getElementById('rhe-chart');
    if (!ctx || !rheSerie.length) return;
    if (rheChart) { rheChart.destroy(); }

    const labels  = rheSerie.map(d => formatFechaRHE(d.fecha));
    const novillo = rheSerie.map(d => d.rhe_novillo);
    const vaca    = rheSerie.map(d => d.rhe_vaca);
    const avgNov  = parseFloat((novillo.reduce((a,b) => a+b, 0) / novillo.length).toFixed(3));
    const avgVac  = parseFloat((vaca.reduce((a,b) => a+b, 0) / vaca.length).toFixed(3));
    const n       = labels.length;

    const datasets = [
        {
            label: 'RHE Novillo',
            data: novillo,
            borderColor: '#2a7235',
            backgroundColor: 'rgba(42,114,53,0.07)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.2,
            fill: false,
            datalabels: { display: false }
        },
        {
            label: 'RHE Vaca',
            data: vaca,
            borderColor: '#8c3030',
            backgroundColor: 'rgba(140,48,48,0.07)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.2,
            fill: false,
            datalabels: { display: false }
        }
    ];

    if (showAverage) {
        datasets.push(
            {
                label: 'Prom. Novillo', data: Array(n).fill(avgNov),
                borderColor: 'rgba(42,114,53,0.25)', borderWidth: 1, borderDash: [5,4], pointRadius: 0, fill: false,
                datalabels: {
                    display: ctx => ctx.dataIndex === n - 1,
                    formatter: v => (v * 100).toFixed(1) + '%',
                    color: '#2a7235',
                    anchor: 'end', align: 'right',
                    font: { size: 10, weight: '600', family: "'IBM Plex Sans', sans-serif" },
                    padding: { left: 6 }
                }
            },
            {
                label: 'Prom. Vaca', data: Array(n).fill(avgVac),
                borderColor: 'rgba(140,48,48,0.25)', borderWidth: 1, borderDash: [5,4], pointRadius: 0, fill: false,
                datalabels: {
                    display: ctx => ctx.dataIndex === n - 1,
                    formatter: v => (v * 100).toFixed(1) + '%',
                    color: '#8c3030',
                    anchor: 'end', align: 'right',
                    font: { size: 10, weight: '600', family: "'IBM Plex Sans', sans-serif" },
                    padding: { left: 6 }
                }
            }
        );
    }

    rheChart = new Chart(ctx, {
        type: 'line',
        plugins: [ChartDataLabels],
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { right: 50 } },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 11, family: "'IBM Plex Sans', sans-serif" },
                        color: '#4a473f',
                        boxWidth: 14,
                        filter: item => !item.text.startsWith('Prom.')
                    },
                    onClick: (e, legendItem, legend) => {
                        const chart = legend.chart;
                        const clicked = legendItem.text; // 'RHE Novillo' o 'RHE Vaca'
                        const isNovillo = clicked === 'RHE Novillo';
                        const onlyOne = chart.data.datasets.some((ds, i) => {
                            if (ds.label === (isNovillo ? 'RHE Vaca' : 'RHE Novillo')) {
                                return !chart.getDatasetMeta(i).hidden;
                            }
                            return false;
                        });
                        // Si el otro está visible → ocultar el otro (modo exclusivo)
                        // Si el otro ya estaba oculto → mostrar todos
                        chart.data.datasets.forEach((ds, i) => {
                            const isNov = ds.label === 'RHE Novillo' || ds.label === 'Prom. Novillo';
                            const isVac = ds.label === 'RHE Vaca'    || ds.label === 'Prom. Vaca';
                            if (!onlyOne) {
                                chart.setDatasetVisibility(i, true); // restaurar todos
                            } else {
                                if (isNovillo) chart.setDatasetVisibility(i, isNov);
                                else           chart.setDatasetVisibility(i, isVac);
                            }
                        });
                        chart.update();
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            if (ctx.dataset.label.startsWith('Prom.')) return null;
                            return ctx.dataset.label + ': ' + (ctx.parsed.y * 100).toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0.65,
                    max: 1.20,
                    ticks: {
                        callback: v => (v * 100).toFixed(0) + '%',
                        font: { size: 12 },
                        color: '#4a473f',
                        stepSize: 0.05
                    },
                    grid: { color: '#efece5' }
                },
                x: {
                    ticks: {
                        font: { size: 11 },
                        color: '#4a473f',
                        maxRotation: 45,
                        minRotation: 45,
                        maxTicksLimit: 24
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function createRHEChart() {
    if (rheSerie.length) { buildRHEChart(); return; }
    fetch('data/rhe-serie.json')
        .then(r => r.json())
        .then(data => { rheSerie = data; buildRHEChart(); })
        .catch(() => {});
}

window.switchRHECategory = function() {}; // mantenido por compatibilidad

// Toggle promedio en gráfico
window.toggleAverage = function() {
    showAverage = document.getElementById('show-avg').checked;
    buildRHEChart();
}

// ============================================
// GRÁFICO TCRE - Tipo de Cambio Real Efectivo
// ============================================
const tcreData = {
    labels: [
        'Mar-21','Abr-21','May-21','Jun-21','Jul-21','Ago-21','Set-21','Oct-21','Nov-21','Dic-21',
        'Ene-22','Feb-22','Mar-22','Abr-22','May-22','Jun-22','Jul-22','Ago-22','Set-22','Oct-22','Nov-22','Dic-22',
        'Ene-23','Feb-23','Mar-23','Abr-23','May-23','Jun-23','Jul-23','Ago-23','Set-23','Oct-23','Nov-23','Dic-23',
        'Ene-24','Feb-24','Mar-24','Abr-24','May-24','Jun-24','Jul-24','Ago-24','Set-24','Oct-24','Nov-24','Dic-24',
        'Ene-25','Feb-25','Mar-25','Abr-25','May-25','Jun-25','Jul-25','Ago-25','Set-25','Oct-25','Nov-25','Dic-25',
        'Ene-26','Feb-26','Mar-26(*)'
    ],
    global: [
        99.93, 100.21, 101.19, 101.08, 100.55, 98.35, 97.49, 98.47, 98.64, 99.52,
        99.45, 98.12, 98.16, 96.89, 93.44, 90.21, 88.43, 88.34, 87.93, 88.01, 85.98, 85.71,
        86.82, 85.55, 85.09, 84.96, 84.93, 83.63, 83.91, 81.69, 81.59, 82.63, 84.65, 84.30,
        82.17, 84.35, 85.55, 85.97, 85.44, 84.61, 86.19, 87.83, 90.74, 91.95, 92.91, 94.93,
        93.34, 92.86, 91.23, 91.42, 91.70, 90.79, 88.86, 88.25, 87.63, 86.99, 87.31, 86.49,
        85.73, 88.16, 92.26
    ],
    extraregional: [
        116.67, 116.09, 116.63, 114.74, 114.29, 111.79, 110.26, 112.33, 113.31, 114.31,
        113.84, 109.73, 106.25, 102.35, 98.59, 96.03, 97.74, 95.03, 93.59, 92.71, 90.89, 91.43,
        93.23, 91.05, 90.10, 89.20, 88.63, 86.44, 86.43, 85.87, 85.44, 87.94, 88.16, 88.51,
        86.93, 86.67, 84.97, 84.28, 84.16, 84.78, 87.06, 88.11, 89.96, 90.18, 90.09, 92.42,
        90.87, 89.39, 87.86, 87.99, 87.41, 86.47, 85.71, 85.33, 85.42, 85.06, 84.44, 84.13,
        82.75, 84.03, 86.93
    ],
    regional: [
        82.66, 83.68, 85.03, 86.53, 85.94, 84.04, 83.83, 83.78, 83.21, 83.98,
        84.26, 85.53, 89.04, 90.54, 87.43, 83.50, 78.20, 80.75, 81.42, 82.52, 80.29, 79.15,
        79.52, 79.21, 79.28, 79.98, 80.55, 80.25, 80.86, 76.79, 77.05, 76.52, 80.48, 79.37,
        76.64, 81.52, 86.18, 87.98, 86.94, 84.33, 85.07, 87.42, 91.61, 94.07, 96.37, 98.00,
        96.35, 97.19, 95.42, 95.71, 97.12, 96.26, 92.76, 91.87, 90.32, 89.33, 90.86, 89.38,
        89.42, 93.38, 99.11
    ],
    china: [
        119.01, 117.54, 118.17, 115.97, 115.42, 112.94, 111.40, 114.11, 115.76, 116.77,
        116.07, 111.76, 108.12, 103.66, 98.16, 95.20, 97.52, 94.24, 91.90, 89.82, 87.34, 88.38,
        90.74, 87.99, 86.48, 84.98, 83.85, 80.66, 80.17, 79.53, 79.27, 81.90, 81.85, 82.37,
        80.67, 80.64, 78.35, 77.66, 77.39, 78.23, 80.24, 81.97, 84.03, 84.28, 83.91, 85.82,
        84.70, 83.10, 80.97, 80.29, 79.78, 78.54, 77.70, 77.35, 77.48, 77.28, 76.87, 76.63,
        75.53, 76.96, 79.57
    ]
};

let tcreChartInstance = null;

function setTCRERange(months) {
    if (!tcreChartInstance) return;
    const n = months ? months : tcreData.labels.length;
    const slice = arr => arr.slice(-n);
    const base100 = Array(n).fill(100);
    tcreChartInstance.data.labels = slice(tcreData.labels);
    tcreChartInstance.data.datasets[0].data = slice(tcreData.global);
    tcreChartInstance.data.datasets[1].data = slice(tcreData.extraregional);
    tcreChartInstance.data.datasets[2].data = slice(tcreData.regional);
    tcreChartInstance.data.datasets[3].data = slice(tcreData.china);
    tcreChartInstance.data.datasets[4].data = base100;
    const pr = n > 30 ? 0 : 3;
    [0,1,2,3].forEach(i => tcreChartInstance.data.datasets[i].pointRadius = pr);
    tcreChartInstance.update();
    document.querySelectorAll('.tcre-range-btn').forEach(b => {
        const r = b.dataset.r;
        b.classList.toggle('active', r === 'all' ? months === null : parseInt(r) === months);
    });
}

function createTCREChart() {
    const ctx = document.getElementById('tcre-chart');
    if (!ctx) return;

    const base100 = Array(tcreData.labels.length).fill(100);
    const pointRadius = tcreData.labels.length > 30 ? 0 : 3;

    tcreChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: tcreData.labels,
            datasets: [
                {
                    label: 'Global',
                    data: tcreData.global,
                    borderColor: '#2a7235',
                    backgroundColor: '#2a723515',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: pointRadius,
                    pointHoverRadius: 4,
                    fill: false
                },
                {
                    label: 'Extraregional',
                    data: tcreData.extraregional,
                    borderColor: '#4a90e2',
                    backgroundColor: '#4a90e215',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: pointRadius,
                    pointHoverRadius: 4,
                    fill: false
                },
                {
                    label: 'Regional',
                    data: tcreData.regional,
                    borderColor: '#c87f2e',
                    backgroundColor: '#c87f2e15',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: pointRadius,
                    pointHoverRadius: 4,
                    fill: false
                },
                {
                    label: '🇨🇳 China',
                    data: tcreData.china,
                    borderColor: '#7b5ea7',
                    backgroundColor: '#7b5ea715',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: pointRadius,
                    pointHoverRadius: 4,
                    fill: false
                },
                {
                    label: 'Base 2019 = 100',
                    data: base100,
                    borderColor: '#918b8055',
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 11, family: "'IBM Plex Sans', sans-serif" },
                        color: '#4a473f',
                        boxWidth: 14,
                        filter: function(item) {
                            return item.text !== 'Base 2019 = 100';
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Base 2019 = 100') return null;
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 70,
                    max: 122,
                    ticks: {
                        callback: function(value) { return value.toFixed(0); },
                        font: { size: 10 },
                        color: '#918b80',
                        stepSize: 10
                    },
                    grid: { color: '#efece5' }
                },
                x: {
                    ticks: {
                        font: { size: 10 },
                        color: '#918b80',
                        maxRotation: 45,
                        minRotation: 45,
                        maxTicksLimit: 20
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================
// GRÁFICO NOVILLO TIPO - Serie mensual
// ============================================
function createNovilloTipoChart() {
    const canvas = document.getElementById('novillo-tipo-chart');
    if (!canvas) return;

    fetch('data/novillo-tipo-serie.json')
        .then(r => r.json())
        .then(serie => {
            const labels  = serie.map(d => d.mes);
            const novillo = serie.map(d => d.novillo);
            const vh      = serie.map(d => d.vh);
            const vai     = serie.map(d => d.vai);

            new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Novillo Tipo (USD/cab)',
                            data: novillo,
                            borderColor: '#8c3030',
                            backgroundColor: 'rgba(140,48,48,0.08)',
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Valor Hacienda',
                            data: vh,
                            borderColor: '#2a7235',
                            backgroundColor: 'transparent',
                            borderWidth: 1.5,
                            borderDash: [4, 3],
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'VAI',
                            data: vai,
                            borderColor: '#a07418',
                            backgroundColor: 'transparent',
                            borderWidth: 1.5,
                            borderDash: [2, 3],
                            pointRadius: 0,
                            pointHoverRadius: 4,
                            tension: 0.3,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { font: { size: 10 }, color: '#4a473f', boxWidth: 12 }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => ctx.dataset.label + ': USD ' + ctx.parsed.y.toLocaleString('es-UY')
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: v => 'USD ' + v.toLocaleString('es-UY'),
                                font: { size: 10 },
                                color: '#918b80',
                                maxTicksLimit: 6
                            },
                            grid: { color: '#efece5' }
                        },
                        x: {
                            ticks: {
                                font: { size: 9 },
                                color: '#918b80',
                                maxRotation: 45,
                                minRotation: 45,
                                maxTicksLimit: 18
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        })
        .catch(() => {});
}

// ============================================
// GRÁFICO AFAP - Participación de mercado
// ============================================
function createAFAPChart() {
    const canvas = document.getElementById('afap-chart');
    if (!canvas) return;

    new Chart(canvas, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
            labels: ['República AFAP', 'AFAP Itaú', 'AFAP SURA', 'Integración AFAP'],
            datasets: [
                {
                    label: '% Afiliados',
                    data: [38.6, 23.3, 22.7, 15.3],
                    backgroundColor: 'rgba(42, 114, 53, 0.75)',
                    borderColor: '#2a7235',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: '% Fondo (FAP)',
                    data: [54.9, 16.9, 18.1, 10.1],
                    backgroundColor: 'rgba(27, 94, 133, 0.75)',
                    borderColor: '#1b5e85',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 11 }, color: '#4a473f', boxWidth: 14 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + '%'
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: v => v.toFixed(1) + '%',
                    font: { size: 12, weight: '600', family: "'IBM Plex Mono', monospace" },
                    color: '#4a473f'
                }
            },
            scales: {
                y: {
                    max: 70,
                    ticks: {
                        callback: v => v + '%',
                        font: { size: 10 },
                        color: '#918b80'
                    },
                    grid: { color: '#efece5' }
                },
                x: {
                    ticks: { font: { size: 11 }, color: '#4a473f' },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================
// GRÁFICOS SECTOR FINANCIERO - BCU
// ============================================

const finDepMeses = ['Feb-25','Mar-25','Abr-25','May-25','Jun-25','Jul-25','Ago-25','Set-25','Oct-25','Nov-25','Dic-25','Ene-26','Feb-26'];
const finDepMN =  [581,552,548,549,563,557,559,569,575,592,610,610,619];
const finDepME = [1347,1351,1355,1356,1311,1346,1343,1342,1354,1334,1271,1304,1302];

// 24 meses: Abr-24 → Mar-26
const finMeses = ['Abr-24','May-24','Jun-24','Jul-24','Ago-24','Set-24','Oct-24','Nov-24','Dic-24','Ene-25','Feb-25','Mar-25','Abr-25','May-25','Jun-25','Jul-25','Ago-25','Set-25','Oct-25','Nov-25','Dic-25','Ene-26','Feb-26','Mar-26'];
const finActPesosEmp = [26155,25096,26391,25588,26073,30208,28298,21340,35258,20486,23095,24219,27954,25754,27888,20354,19420,20788,28294,29108,34803,26123,27000,29904];
const finActPesosFam = [4026,3558,3073,3757,3961,10249,9387,22659,15128,4791,4775,4308,4180,3995,3873,4015,4114,12572,10486,25815,16718,4798,4296,13584];
const finActUSD = [2139,2026,2090,2243,2000,1907,2234,2144,2465,1670,1667,1899,2012,2281,2510,2257,2162,2287,2453,2423,2836,2187,2130,2487];
// UI credits (M UI) — BCU capitales operados, Total Sist.Bancario
const finActUI = [1099,1065,853,1059,1115,3491,2992,1576,1807,974,1051,1048,990,1260,1559,1815,1197,4244,2897,1631,1681,862,861,6381];
// TC UI->pesos: valores reales DGI (ODS 2023-2025) + interpolación 2025 + datos web DGI ene-mar-26
const finUITC = [6.00,6.02,6.04,6.07,6.08,6.10,6.12,6.14,6.16,6.18,6.20,6.22,6.24,6.26,6.29,6.31,6.33,6.36,6.38,6.41,6.43,6.42,6.44,6.48];

function createFinDepositosChart() {
    const ctx = document.getElementById('fin-depositos-chart');
    if (!ctx) return;
    const totales = finDepMN.map((mn, i) => mn + finDepME[i]);
    const pctMN = finDepMN.map((mn, i) => parseFloat((mn / totales[i] * 100).toFixed(1)));
    const pctME = finDepME.map((me, i) => parseFloat((me / totales[i] * 100).toFixed(1)));
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: finDepMeses,
            datasets: [
                {
                    label: 'Moneda Nacional (%)',
                    data: pctMN,
                    backgroundColor: '#0f5c6b',
                    borderRadius: 3,
                    stack: 'dep'
                },
                {
                    label: 'Moneda Extranjera (%)',
                    data: pctME,
                    backgroundColor: '#4ab8cb',
                    borderRadius: 3,
                    stack: 'dep'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 12 }, color: '#4a473f', boxWidth: 14 } },
                datalabels: {
                    display: true,
                    formatter: v => v.toFixed(1) + '%',
                    color: '#fff',
                    font: { size: 10, weight: '600' }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const i = ctx.dataIndex;
                            const raw = ctx.datasetIndex === 0 ? finDepMN[i] : finDepME[i];
                            return ` ${ctx.dataset.label}: ${ctx.raw}% ($${raw.toLocaleString('es-UY')} MM)`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true, ticks: { font: { size: 10 }, color: '#666' }, grid: { display: false } },
                y: { stacked: true, max: 100, ticks: { font: { size: 10 }, color: '#666', callback: v => v + '%' }, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

// Datos CIIU — saldo cartera SNF Total Sist.Bancario (BCU, TOTAL MN+ME, Total vencimiento)
const ciiu13m = ['Feb-25','Mar-25','Abr-25','May-25','Jun-25','Jul-25','Ago-25','Set-25','Oct-25','Nov-25','Dic-25','Ene-26','Feb-26'];
const ciiuFamilias    = [378974.79,382291.59,386306.51,388989.75,389718.99,393338.93,393077.22,400176.86,406488.25,412777.65,420576.57,422471.45,424686.40];
const ciiuAgro        = [166898.55,166838.30,167266.59,168537.31,154551.43,156010.75,154550.06,155761.46,155726.73,155242.40,157710.60,156180.09,159612.82];
const ciiuComercio    = [128981.27,129303.36,131063.07,139437.19,134765.90,137987.82,138962.06,138580.54,136075.73,139429.89,142938.48,138592.40,138199.95];
const ciiuIndustria   = [100797.57,103143.80,105060.04,106361.02,102561.11,101682.07,100827.78, 97041.90, 98939.64, 99840.01,101715.08, 98414.65, 93029.28];
const ciiuConstruccion= [ 48704.10, 51853.15, 52358.63, 52734.17, 52262.43, 53379.81, 52373.32, 51442.40, 52183.42, 54294.34, 52478.91, 52787.22, 54083.51];

const ciiuFeb26Labels = ['Familias','Agropecuario','Comercio y hotelería','Industria manuf.','Construcción','Otros servicios','Transporte y com.','Inmobiliario','Serv. financieros','Elec., gas y agua'];
const ciiuFeb26Values = [424686.40,159612.82,138199.95,93029.28,54083.51,46478.43,38744.64,37457.07,31760.62,12222.69];
const ciiuFeb26Colors = ['#0f5c6b','#2a7235','#4ab8cb','#e08c00','#c05000','#6b3fa0','#1b6cc0','#b04060','#4a8060','#808040'];

function createFinCreditoPesosChart() {
    const ctx = document.getElementById('fin-credito-pesos-chart');
    if (!ctx) return;
    const total = ciiuFeb26Values.reduce((a, b) => a + b, 0);
    const pct = ciiuFeb26Values.map(v => parseFloat((v / total * 100).toFixed(1)));
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ciiuFeb26Labels,
            datasets: [{
                label: 'Participación feb-26',
                data: pct,
                backgroundColor: ciiuFeb26Colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: v => v.toFixed(1) + '%',
                    color: '#4a473f',
                    font: { size: 10, weight: '600' }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const i = ctx.dataIndex;
                            return ` ${ctx.raw}% ($${ciiuFeb26Values[i].toLocaleString('es-UY', {maximumFractionDigits:0})} M)`;
                        }
                    }
                }
            },
            scales: {
                x: { max: 45, ticks: { font: { size: 10 }, color: '#666', callback: v => v + '%' }, grid: { color: '#f0f0f0' } },
                y: { ticks: { font: { size: 11 }, color: '#333' }, grid: { display: false } }
            }
        }
    });
}

function createFinCreditoUSDChart() {
    const ctx = document.getElementById('fin-credito-usd-chart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ciiu13m,
            datasets: [
                { label: 'Agropecuario',      data: ciiuAgro,         borderColor: '#2a7235', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.3 },
                { label: 'Comercio',           data: ciiuComercio,     borderColor: '#4ab8cb', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.3 },
                { label: 'Industria manuf.',   data: ciiuIndustria,    borderColor: '#e08c00', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.3 },
                { label: 'Construcción',       data: ciiuConstruccion, borderColor: '#c05000', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 11 }, color: '#4a473f', boxWidth: 14 } },
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: $${ctx.raw.toLocaleString('es-UY', {maximumFractionDigits:0})} M`
                    }
                }
            },
            scales: {
                x: { ticks: { font: { size: 10 }, color: '#666' }, grid: { display: false } },
                y: { ticks: { font: { size: 10 }, color: '#666', callback: v => '$' + (v/1000).toFixed(0) + 'K' }, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

function createFinInstitucionesChart() {
    const ctx = document.getElementById('fin-instituciones-chart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Bancos Privados', 'Bancos Públicos', 'Casas Financieras', 'Cooperativas'],
            datasets: [{
                data: [1037041, 882109, 1102, 536],
                backgroundColor: ['#0f5c6b', '#4ab8cb', '#f0a500', '#2a7235'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 12 }, color: '#4a473f', boxWidth: 14 } },
                datalabels: {
                    display: true,
                    formatter: (value, ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        return (value / total * 100).toFixed(1) + '%';
                    },
                    color: '#fff',
                    font: { size: 13, weight: '700' }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` $${(ctx.raw / 1000).toFixed(0)}M MM (${(ctx.raw / 1920788 * 100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

function createFinCapPesosChart() {
    const ctx = document.getElementById('fin-cap-pesos-chart');
    if (!ctx) return;
    // TC USD->pesos, mensual BCU, Abr-24 a Mar-26
    const finTC = [39.50,39.80,40.00,40.30,40.60,41.00,41.40,41.80,42.20,42.60,42.90,43.07,43.49,43.85,43.52,43.11,42.58,41.97,41.41,40.85,40.10,39.51,38.40,40.258];
    const totMN  = finActPesosEmp.map((e, i) => e + finActPesosFam[i]);
    const totUI  = finActUI.map((u, i) => Math.round(u * finUITC[i]));
    const totUSD = finActUSD.map((u, i) => u * finTC[i]);
    const gran   = totMN.map((p, i) => p + totUI[i] + totUSD[i]);
    const pctMN  = totMN.map((p, i)  => parseFloat((p  / gran[i] * 100).toFixed(1)));
    const pctUI  = totUI.map((u, i)  => parseFloat((u  / gran[i] * 100).toFixed(1)));
    const pctUSD = totUSD.map((u, i) => parseFloat((u  / gran[i] * 100).toFixed(1)));
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: finMeses,
            datasets: [
                { label: 'Pesos ($)',          data: pctMN,  backgroundColor: '#0f5c6b', borderRadius: 3, stack: 'cr' },
                { label: 'UI (en $)',           data: pctUI,  backgroundColor: '#4ab8cb', borderRadius: 3, stack: 'cr' },
                { label: 'USD (en $)',          data: pctUSD, backgroundColor: '#f0a500', borderRadius: 3, stack: 'cr' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 12 }, color: '#4a473f', boxWidth: 14 } },
                datalabels: { display: true, formatter: v => v > 4 ? v.toFixed(1) + '%' : '', color: '#fff', font: { size: 10, weight: '600' } },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const i = ctx.dataIndex;
                            if (ctx.datasetIndex === 0) return ` Pesos: ${ctx.raw}% ($${totMN[i].toLocaleString('es-UY')} M)`;
                            if (ctx.datasetIndex === 1) return ` UI: ${ctx.raw}% (${finActUI[i].toLocaleString('es-UY')} M UI = $${totUI[i].toLocaleString('es-UY')} M)`;
                            return ` USD: ${ctx.raw}% (USD ${finActUSD[i].toLocaleString('es-UY')} M)`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true, ticks: { font: { size: 10 }, color: '#666' }, grid: { display: false } },
                y: { stacked: true, max: 100, ticks: { font: { size: 10 }, color: '#666', callback: v => v + '%' }, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

function createFinCapUSDChart() {
    const ctx = document.getElementById('fin-cap-usd-chart');
    if (!ctx) return;
    const finTC2 = [39.50,39.80,40.00,40.30,40.60,41.00,41.40,41.80,42.20,42.60,42.90,43.07,43.49,43.85,43.52,43.11,42.58,41.97,41.41,40.85,40.10,39.51,38.40,40.258];
    const totMN  = finActPesosEmp.map((e, i) => e + finActPesosFam[i]);
    const totUI  = finActUI.map((u, i) => Math.round(u * finUITC[i]));
    const totUSD = finActUSD.map((u, i) => Math.round(u * finTC2[i]));
    const tooltipUnits = [
        (i, v) => `$${totMN[i].toLocaleString('es-UY')} M pesos`,
        (i, v) => `${finActUI[i].toLocaleString('es-UY')} M UI = $${totUI[i].toLocaleString('es-UY')} M`,
        (i, v) => `USD ${finActUSD[i].toLocaleString('es-UY')} M = $${totUSD[i].toLocaleString('es-UY')} M`
    ];
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: finMeses,
            datasets: [
                {
                    label: 'Pesos ($)',
                    data: totMN,
                    borderColor: '#0f5c6b',
                    backgroundColor: 'rgba(15,92,107,0.08)',
                    borderWidth: 2.5, pointRadius: 3, tension: 0.3, fill: true,
                    hidden: true
                },
                {
                    label: 'UI (en $)',
                    data: totUI,
                    borderColor: '#4ab8cb',
                    backgroundColor: 'rgba(74,184,203,0.08)',
                    borderWidth: 2.5, pointRadius: 3, tension: 0.3, fill: true,
                    hidden: true
                },
                {
                    label: 'USD (en $)',
                    data: totUSD,
                    borderColor: '#f0a500',
                    backgroundColor: 'rgba(240,165,0,0.08)',
                    borderWidth: 2.5, pointRadius: 3, tension: 0.3, fill: true,
                    hidden: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12 }, color: '#4a473f', boxWidth: 14 },
                    onClick: (e, legendItem, legend) => {
                        const idx = legendItem.datasetIndex;
                        const chart = legend.chart;
                        chart.data.datasets.forEach((_, i) => chart.setDatasetVisibility(i, i === idx));
                        chart.update();
                    }
                },
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${tooltipUnits[ctx.datasetIndex](ctx.dataIndex, ctx.raw)}`
                    }
                }
            },
            scales: {
                x: { ticks: { font: { size: 10 }, color: '#666' }, grid: { display: false } },
                y: { ticks: { font: { size: 10 }, color: '#666', callback: v => '$' + (v/1000).toFixed(0) + 'K' }, grid: { color: '#f0f0f0' } }
            }
        }
    });
}

// Inicializar cuando Chart.js esté listo
window.addEventListener('load', function() {
    if (typeof Chart !== 'undefined') {
        createRHEChart();
        createTCREChart();
        createAFAPChart();
        createNovilloTipoChart();
        createFinDepositosChart();
        createFinCreditoPesosChart();
        createFinCreditoUSDChart();
        createFinInstitucionesChart();
        createFinCapPesosChart();
        createFinCapUSDChart();
    }
});
