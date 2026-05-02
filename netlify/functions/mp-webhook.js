const https = require('https');

const MP_PLAN_ID = process.env.MP_PLAN_ID;
const MP_TOKEN   = process.env.MP_ACCESS_TOKEN;
const SITE_ID    = process.env.NETLIFY_SITE_ID;
const API_TOKEN  = process.env.NETLIFY_API_TOKEN;

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { 'Authorization': 'Bearer ' + token },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });
}

function patch(url, token, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let notification;
  try { notification = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, action, data } = notification;
  console.log('MP webhook:', type, action, data?.id);

  // Solo procesar suscripciones creadas o aprobadas
  if (type !== 'subscription_preapproval') return { statusCode: 200, body: 'ok' };
  if (!['created', 'updated'].includes(action)) return { statusCode: 200, body: 'ok' };

  // Obtener detalles de la suscripción desde MercadoPago
  const subRes = await get(`https://api.mercadopago.com/preapproval/${data.id}`, MP_TOKEN);
  if (subRes.status !== 200) {
    console.error('Error MP:', subRes.status, subRes.body);
    return { statusCode: 200, body: 'ok' };
  }

  const sub = subRes.body;
  console.log('Subscription status:', sub.status, 'plan:', sub.preapproval_plan_id);

  if (sub.preapproval_plan_id !== MP_PLAN_ID) return { statusCode: 200, body: 'ok' };

  const email = sub.payer_email;
  const isPaid = sub.status === 'authorized';
  if (!email) { console.error('No payer_email'); return { statusCode: 200, body: 'ok' }; }

  // Buscar usuario en Netlify Identity
  const searchRes = await get(
    `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity/users?search=${encodeURIComponent(email)}`,
    API_TOKEN
  );
  if (searchRes.status !== 200) {
    console.error('Error buscando usuario:', searchRes.status, searchRes.body);
    return { statusCode: 200, body: 'ok' };
  }

  const users = searchRes.body.users || [];
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log('Usuario no encontrado:', email);
    return { statusCode: 200, body: 'ok' };
  }

  // Actualizar metadata del usuario
  const updateRes = await patch(
    `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity/users/${user.id}`,
    API_TOKEN,
    { data: { premium: isPaid, premium_since: isPaid ? new Date().toISOString() : null, mp_subscription_id: data.id } }
  );
  console.log('Update usuario:', updateRes.status, updateRes.body);

  return { statusCode: 200, body: 'ok' };
};
