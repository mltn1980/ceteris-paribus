const https = require('https');

function supabaseInsert(url, key, row) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(row);
    const baseUrl = url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const fullUrl = baseUrl + '/rest/v1/costos_usuarios?on_conflict=user_id';
    console.log('Supabase URL:', fullUrl);
    const parsed = new URL(fullUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Supabase no configurado' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { user_id, user_email, costos } = body;
  if (!user_id || !costos) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Faltan datos' }) };
  }

  const row = {
    user_id,
    user_email: user_email || null,
    fecha: new Date().toISOString(),
    ganaderia: costos.ganaderia ?? null,
    soja:      costos.soja      ?? null,
    trigo:     costos.trigo     ?? null,
    maiz:      costos.maiz      ?? null,
    colza:     costos.colza     ?? null,
    girasol:   costos.girasol   ?? null,
    arroz:     costos.arroz     ?? null,
    lecheria:  costos.lecheria  ?? null,
  };

  const result = await supabaseInsert(SUPABASE_URL, SUPABASE_KEY, row);
  if (result.status >= 300) {
    console.error('Supabase error:', result.status, result.body);
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Error al guardar en Supabase' }) };
  }

  return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
};
