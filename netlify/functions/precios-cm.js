const https = require('https');
const XLSX = require('xlsx');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const FILE_PATH = 'data/precios.json';

exports.schedule = '0 10 */2 * *';

// Each product: regex to identify section header in col A, regex to identify target row description
const TARGETS = {
  soja:    { header: /^soja$/i,           desc: /industria.*nueva.*mvd/i,       label: 'Industria zafra nueva - Mvd.' },
  trigo:   { header: /^trigo$/i,          desc: /export.*disponible.*palmira/i, label: 'Export disponible - N. Palmira' },
  maiz:    { header: /^ma[íi]z$/i,        desc: /grado\s*ii.*disponible/i,      label: 'Grado II disponible - Mvd.' },
  girasol: { header: /^girasol$/i,        desc: /industria.*nueva.*mvd/i,       label: 'Industria zafra nueva - Mvd.' },
  colza:   { header: /^(colza|canola)$/i, desc: /export.*nueva.*palmira/i,      label: 'Export zafra nueva - N. Palmira' }
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBinary(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parsePrice(val) {
  const str = String(val ?? '').trim();
  // "395/405" → take midpoint
  const range = str.match(/^(\d[\d.]*)\s*\/\s*(\d[\d.]*)/);
  if (range) {
    const a = parseFloat(range[1].replace(/\./g, ''));
    const b = parseFloat(range[2].replace(/\./g, ''));
    return Math.round((a + b) / 2);
  }
  const num = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  return isNaN(num) ? null : Math.round(num);
}

function getRightmost(row) {
  for (let i = row.length - 1; i >= 1; i--) {
    const v = row[i];
    if (v !== '' && v != null) {
      const p = parsePrice(v);
      if (p && p > 50) return p; // sanity: grain prices > 50 USD/t
    }
  }
  return null;
}

function extractPrecios(rows) {
  const result = {};
  let currentProduct = null;

  for (const row of rows) {
    // Check first 3 columns for product section headers
    for (let ci = 0; ci < Math.min(row.length, 3); ci++) {
      const cell = String(row[ci] ?? '').trim();
      for (const [prod, t] of Object.entries(TARGETS)) {
        if (t.header.test(cell)) {
          currentProduct = prod;
          break;
        }
      }
    }

    // Within the current product section, look for target description row
    if (currentProduct && !result[currentProduct]) {
      for (let ci = 0; ci < Math.min(row.length, 3); ci++) {
        const cell = String(row[ci] ?? '').trim();
        const t = TARGETS[currentProduct];
        if (t.desc.test(cell)) {
          const price = getRightmost(row);
          if (price) {
            result[currentProduct] = { precio: price, desc: t.label };
            break;
          }
        }
      }
    }
  }

  return result;
}

async function findXlsxUrl() {
  const html = await fetchText('https://camaramercantil.com.uy/cereales-y-oleaginosas/');
  const match = html.match(/https:\/\/camaramercantil\.com\.uy\/wp-content\/uploads\/[\d/]+\/[\w.-]+\.xlsx/);
  return match ? match[0] : null;
}

async function getFileSha() {
  try {
    const res = await fetchText(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?t=${Date.now()}`);
    return JSON.parse(res).sha || null;
  } catch { return null; }
}

async function updateGitHub(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = JSON.stringify({
    message: `[bot] Actualiza precios Cámara Mercantil - ${data.fecha}`,
    content,
    ...(sha ? { sha } : {})
  });
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'netlify-function',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async () => {
  try {
    const xlsxUrl = await findXlsxUrl();
    if (!xlsxUrl) return { statusCode: 500, body: 'No se encontró URL del Excel en camaramercantil.com.uy' };

    console.log('Descargando:', xlsxUrl);
    const buffer = await fetchBinary(xlsxUrl);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const precios = extractPrecios(rows);
    if (!Object.keys(precios).length) {
      return { statusCode: 500, body: 'No se extrajeron precios del Excel. Revisar estructura del archivo.' };
    }

    const today = new Date().toISOString().split('T')[0];
    const payload = { fecha: today, fuente: 'Cámara Mercantil de Productos del País', precios };

    console.log('Precios extraídos:', JSON.stringify(precios));
    const sha = await getFileSha();
    await updateGitHub(payload, sha);

    return { statusCode: 200, body: JSON.stringify(payload) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
