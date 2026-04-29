const fs = require('fs');
const path = require('path');

const ALLOWED = ['novillo', 'faena'];

exports.handler = async function(event, context) {
    const user = (context.clientContext || {}).user;

    if (!user) {
        return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'no_auth' })
        };
    }

    const file = (event.queryStringParameters || {}).file;
    if (!file || !ALLOWED.includes(file)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'invalid_file' }) };
    }

    try {
        const dataPath = path.join(__dirname, '..', '..', 'data', `${file}.json`);
        const data = fs.readFileSync(dataPath, 'utf8');
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            body: data
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: 'read_error' }) };
    }
};
