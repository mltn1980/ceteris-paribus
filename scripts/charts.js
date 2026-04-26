// ============================================
// CHARTS.JS - Gráficos con Chart.js
// ============================================

let rheChart = null;
let currentCategory = 'novillo';
let showAverage = true;

// Datos RHE hardcodeados (alternativa: cargar desde data/rhe-historico.json)
const rheData = {
    labels: [2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2021, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2022, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2024, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026, 2026],
    novillo: [0.9238, 0.9055, 0.8998, 0.8781, 0.8688, 0.8833, 0.9586, 0.9807, 0.9535, 0.9171, 0.898, 0.887, 0.902, 0.9003, 0.9272, 0.8941, 0.904, 0.9179, 0.9283, 0.9447, 0.9477, 0.9905, 0.9869, 0.9557, 0.9466, 0.9635, 0.9681, 0.9812, 1.0014, 1.032, 1.0086, 0.9957, 1.0091, 1.0246, 1.0123, 0.9638, 0.9366, 0.9682, 1.0103, 1.0364, 1.0264, 1.0455, 1.0426, 1.0095, 0.9706, 0.9026, 0.9242, 0.8864, 0.9262, 0.8989, 0.9135, 0.9052, 0.914, 0.9112, 0.9361, 0.9416, 0.9695, 0.9622, 0.9963, 0.9624, 1.0014, 1.0004, 1.0249, 1.0198, 1.0073, 1.0111, 0.9844, 1.0217, 1.0286, 1.0453, 1.007, 1.0217, 1.0015, 0.9939, 0.9946, 1.027, 1.0671, 1.0851, 1.0732, 1.0504, 1.0303, 1.0242, 1.0478, 1.0245, 1.032, 1.0034, 1.0472, 1.043, 1.0547, 1.0377, 0.9864, 0.963, 0.8987, 0.8765, 0.8534, 0.892, 0.9065, 0.926, 0.9065, 0.9084, 0.9373, 0.967, 0.9507, 0.9219, 0.8959, 0.9136, 0.9037, 0.9018, 0.9088, 0.878, 0.8952, 0.8602, 0.8895, 0.9017, 0.9443, 0.9473, 0.9308, 0.9349, 0.9587, 0.9917, 0.9969, 0.9978, 0.9609, 0.9477, 0.9285, 0.929, 0.9292, 0.9513, 0.94, 0.9783, 0.9602, 0.9806, 0.9108, 0.9183, 0.9258, 0.9849, 0.989, 0.9601, 0.9464, 0.9231, 0.9289, 0.8608, 0.848, 0.8258, 0.8487, 0.8471, 0.8893, 0.8622, 0.8951, 0.8588, 0.8572, 0.8168, 0.8393, 0.854, 0.8878, 0.8892, 0.8948, 0.8868, 0.9117, 0.9163, 0.9356, 0.9134, 0.9014, 0.8698, 0.8496, 0.8538, 0.8929, 0.9416, 0.9542, 0.9382, 0.9339, 0.9344, 0.9738, 0.9611, 0.9465, 0.9132, 0.8901, 0.8823, 0.8661, 0.918, 0.9496, 0.9653, 0.9765, 0.929, 0.9323, 0.9491, 0.9822, 1.0129, 0.9775, 0.9539, 0.9138, 0.9675, 0.9694, 0.9918, 0.9283, 0.9488, 0.9034, 0.929, 0.8941, 0.9051, 0.8965, 0.8965, 0.8589, 0.8918, 0.9114, 0.9402, 0.9361, 0.9197, 0.913, 0.8931, 0.8998, 0.9021, 0.8898, 0.909, 0.9294, 0.9077, 0.8915, 0.8837, 0.9258, 0.9545, 0.9671, 0.969, 0.9767, 0.9867, 0.9579, 0.9405, 0.9274, 0.9317, 0.919, 0.9082, 0.9483, 0.981, 1.011, 1.0084, 0.9931, 1.0271, 1.0138, 0.995, 0.9647, 0.9573, 0.9317, 0.9299, 0.9633, 1.0243, 1.0393, 1.0394, 1.0174, 1.0609, 1.1256, 1.1606, 1.0675, 1.0684, 1.0082, 1.0359, 0.9369, 0.9573, 0.9531, 1.0344, 1.015, 1.0151, 0.9894, 0.9937, 0.9968, 0.9823, 1.0118, 1.0128, 1.0139, 1.0323, 1.0487, 1.0501, 1.0324, 0.9916, 0.9923, 0.9734, 0.9565, 0.959],
    vaca: [0.8415, 0.8239, 0.8147, 0.7958, 0.7876, 0.7967, 0.8573, 0.8794, 0.8599, 0.8399, 0.8297, 0.8244, 0.8405, 0.8367, 0.8606, 0.8294, 0.8366, 0.8472, 0.8574, 0.8689, 0.8734, 0.9148, 0.9153, 0.8887, 0.8834, 0.899, 0.9032, 0.9159, 0.9315, 0.9579, 0.9354, 0.9214, 0.9344, 0.9475, 0.9363, 0.8899, 0.8633, 0.8925, 0.9375, 0.9726, 0.9674, 0.981, 0.976, 0.9378, 0.8979, 0.8269, 0.8382, 0.8001, 0.8373, 0.8196, 0.8356, 0.8309, 0.8374, 0.8316, 0.8522, 0.8511, 0.8724, 0.8645, 0.8999, 0.8784, 0.9257, 0.9307, 0.9598, 0.957, 0.9474, 0.9509, 0.9268, 0.9612, 0.969, 0.9841, 0.95, 0.9676, 0.9461, 0.9347, 0.9282, 0.9546, 0.9909, 1.0077, 1.0006, 0.9755, 0.9528, 0.939, 0.9505, 0.9238, 0.9248, 0.8989, 0.942, 0.9441, 0.959, 0.9321, 0.869, 0.8395, 0.7832, 0.7557, 0.7191, 0.7338, 0.7253, 0.7329, 0.725, 0.7555, 0.7978, 0.8251, 0.8116, 0.7874, 0.7736, 0.7824, 0.7762, 0.7754, 0.7658, 0.7345, 0.7499, 0.7294, 0.7669, 0.7882, 0.8311, 0.8372, 0.8315, 0.8389, 0.8643, 0.8862, 0.8886, 0.8833, 0.8446, 0.83, 0.8146, 0.8157, 0.8202, 0.8434, 0.8392, 0.8642, 0.8408, 0.846, 0.7892, 0.7873, 0.7942, 0.8437, 0.8452, 0.8151, 0.7987, 0.7811, 0.7931, 0.737, 0.7338, 0.7101, 0.7151, 0.7136, 0.738, 0.7054, 0.7205, 0.6905, 0.7018, 0.6845, 0.7206, 0.7433, 0.781, 0.7894, 0.7936, 0.7805, 0.7997, 0.8108, 0.8256, 0.8004, 0.7802, 0.7574, 0.7466, 0.7596, 0.7977, 0.8431, 0.854, 0.8399, 0.8361, 0.8332, 0.8697, 0.8568, 0.8405, 0.8056, 0.7873, 0.7903, 0.7819, 0.8318, 0.8587, 0.8735, 0.8852, 0.8429, 0.8521, 0.8678, 0.8944, 0.9182, 0.8826, 0.8648, 0.8369, 0.8882, 0.8915, 0.9097, 0.8526, 0.8713, 0.8292, 0.8543, 0.8196, 0.8309, 0.8218, 0.8219, 0.7899, 0.8237, 0.8434, 0.8702, 0.8662, 0.8524, 0.8451, 0.8295, 0.8349, 0.8357, 0.8174, 0.8305, 0.8455, 0.8274, 0.8167, 0.8098, 0.8488, 0.8807, 0.8986, 0.906, 0.9118, 0.9218, 0.8927, 0.8773, 0.8663, 0.8708, 0.8613, 0.854, 0.8961, 0.9301, 0.9637, 0.9638, 0.9462, 0.979, 0.9671, 0.951, 0.9202, 0.9094, 0.8814, 0.8757, 0.9072, 0.9651, 0.9883, 0.9928, 0.9734, 1.0103, 1.0714, 1.1036, 1.0134, 1.0091, 0.9426, 0.9577, 0.8581, 0.8733, 0.8689, 0.9426, 0.923, 0.9206, 0.8949, 0.8998, 0.9036, 0.8912, 0.9232, 0.9293, 0.9378, 0.9575, 0.9791, 0.9902, 0.9758, 0.9337, 0.9188, 0.8914, 0.859, 0.855],
    promedioNovillo: 0.936,
    promedioVaca: 0.847
};

// ============================================
// GRÁFICO RHE - Relación Hacienda Export
// ============================================
function createRHEChart() {
    const ctx = document.getElementById('rhe-chart');
    if (!ctx) return;
    
    if (rheChart) {
        rheChart.destroy();
    }
    
    const data = currentCategory === 'novillo' ? rheData.novillo : rheData.vaca;
    const promedio = currentCategory === 'novillo' ? rheData.promedioNovillo : rheData.promedioVaca;
    const color = currentCategory === 'novillo' ? '#2a7235' : '#8c3030';
    const colorLight = currentCategory === 'novillo' ? '#8cc499' : '#e89b9b';
    
    const datasets = [{
        label: currentCategory === 'novillo' ? 'RHE Novillo' : 'RHE Vaca',
        data: data,
        borderColor: color,
        backgroundColor: colorLight + '20',
        borderWidth: 2,
        tension: 0.1,
        fill: false
    }];
    
    if (showAverage) {
        datasets.push({
            label: 'Promedio histórico',
            data: Array(rheData.labels.length).fill(promedio),
            borderColor: color + '80',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
        });
    }
    
    rheChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: rheData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 11, family: "'IBM Plex Sans', sans-serif" },
                        color: '#4a473f'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + (context.parsed.y * 100).toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: Math.min(...data) - 0.05,
                    max: Math.max(...data) + 0.02,
                    ticks: {
                        callback: function(value) {
                            return (value * 100).toFixed(0) + '%';
                        },
                        font: { size: 10 },
                        color: '#918b80'
                    },
                    grid: {
                        color: '#efece5'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10 },
                        color: '#918b80',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Cambiar categoría del gráfico (Novillo / Vaca)
window.switchRHECategory = function(category) {
    currentCategory = category;
    
    const tabNovillo = document.getElementById('tab-novillo');
    const tabVaca = document.getElementById('tab-vaca');
    
    if (category === 'novillo') {
        tabNovillo.style.background = 'var(--green-l)';
        tabNovillo.style.borderBottomColor = 'var(--green)';
        tabNovillo.style.color = 'var(--green)';
        tabVaca.style.background = 'transparent';
        tabVaca.style.borderBottomColor = 'transparent';
        tabVaca.style.color = 'var(--text2)';
    } else {
        tabVaca.style.background = 'var(--red-l)';
        tabVaca.style.borderBottomColor = 'var(--red)';
        tabVaca.style.color = 'var(--red)';
        tabNovillo.style.background = 'transparent';
        tabNovillo.style.borderBottomColor = 'transparent';
        tabNovillo.style.color = 'var(--text2)';
    }
    
    createRHEChart();
}

// Toggle promedio en gráfico
window.toggleAverage = function() {
    showAverage = document.getElementById('show-avg').checked;
    createRHEChart();
}

// ============================================
// GRÁFICO TCRE - Tipo de Cambio Real Efectivo
// ============================================
const tcreData = {
    labels: [
        'Feb-21','Mar-21','Abr-21','May-21','Jun-21','Jul-21','Ago-21','Set-21','Oct-21','Nov-21','Dic-21',
        'Ene-22','Feb-22','Mar-22','Abr-22','May-22','Jun-22','Jul-22','Ago-22','Set-22','Oct-22','Nov-22','Dic-22',
        'Ene-23','Feb-23','Mar-23','Abr-23','May-23','Jun-23','Jul-23','Ago-23','Set-23','Oct-23','Nov-23','Dic-23',
        'Ene-24','Feb-24','Mar-24','Abr-24','May-24','Jun-24','Jul-24','Ago-24','Set-24','Oct-24','Nov-24','Dic-24',
        'Ene-25','Feb-25','Mar-25','Abr-25','May-25','Jun-25','Jul-25','Ago-25','Set-25','Oct-25','Nov-25','Dic-25',
        'Ene-26','Feb-26(*)'
    ],
    global: [
        97.20, 99.93, 100.21, 101.19, 101.08, 100.55, 98.35, 97.49, 98.47, 98.64, 99.52,
        99.45, 98.12, 98.16, 96.89, 93.44, 90.21, 88.43, 88.34, 87.93, 88.01, 85.98, 85.71,
        86.82, 85.55, 85.09, 84.96, 84.93, 83.63, 83.91, 81.69, 81.59, 82.63, 84.65, 84.30,
        82.17, 84.35, 85.55, 85.97, 85.44, 84.61, 86.19, 87.83, 90.74, 91.95, 92.91, 94.93,
        93.34, 92.86, 91.23, 91.42, 91.70, 90.79, 88.86, 88.25, 87.63, 86.99, 87.31, 86.49,
        85.73, 88.16
    ],
    extraregional: [
        114.28, 116.67, 116.09, 116.63, 114.74, 114.29, 111.79, 110.26, 112.33, 113.31, 114.31,
        113.84, 109.73, 106.25, 102.35, 98.59, 96.03, 97.74, 95.03, 93.59, 92.71, 90.89, 91.43,
        93.23, 91.05, 90.10, 89.20, 88.63, 86.44, 86.43, 85.87, 85.44, 87.94, 88.16, 88.51,
        86.93, 86.67, 84.97, 84.28, 84.16, 84.78, 87.06, 88.11, 89.96, 90.18, 90.09, 92.42,
        90.87, 89.39, 87.86, 87.99, 87.41, 86.47, 85.71, 85.33, 85.42, 85.06, 84.44, 84.13,
        82.75, 84.03
    ],
    regional: [
        79.72, 82.66, 83.68, 85.03, 86.53, 85.94, 84.04, 83.83, 83.78, 83.21, 83.98,
        84.26, 85.53, 89.04, 90.54, 87.43, 83.50, 78.20, 80.75, 81.42, 82.52, 80.29, 79.15,
        79.52, 79.21, 79.28, 79.98, 80.55, 80.25, 80.86, 76.79, 77.05, 76.52, 80.48, 79.37,
        76.64, 81.52, 86.18, 87.98, 86.94, 84.33, 85.07, 87.42, 91.61, 94.07, 96.37, 98.00,
        96.35, 97.19, 95.42, 95.71, 97.12, 96.26, 92.76, 91.87, 90.32, 89.33, 90.86, 89.38,
        89.42, 93.38
    ],
    china: [
        117.07, 119.01, 117.54, 118.17, 115.97, 115.42, 112.94, 111.40, 114.11, 115.76, 116.77,
        116.07, 111.76, 108.12, 103.66, 98.16, 95.20, 97.52, 94.24, 91.90, 89.82, 87.34, 88.38,
        90.74, 87.99, 86.48, 84.98, 83.85, 80.66, 80.17, 79.53, 79.27, 81.90, 81.85, 82.37,
        80.67, 80.64, 78.35, 77.66, 77.39, 78.23, 80.24, 81.97, 84.03, 84.28, 83.91, 85.82,
        84.70, 83.10, 80.97, 80.29, 79.78, 78.54, 77.70, 77.35, 77.48, 77.28, 76.87, 76.63,
        75.53, 76.96
    ]
};

function createTCREChart() {
    const ctx = document.getElementById('tcre-chart');
    if (!ctx) return;

    const base100 = Array(tcreData.labels.length).fill(100);
    const pointRadius = tcreData.labels.length > 30 ? 0 : 3;

    new Chart(ctx, {
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

// Inicializar cuando Chart.js esté listo
window.addEventListener('load', function() {
    if (typeof Chart !== 'undefined') {
        createRHEChart();
        createTCREChart();
        createAFAPChart();
        createNovilloTipoChart();
    }
});
