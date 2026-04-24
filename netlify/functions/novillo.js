const https = require("https");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // ej: "mltn1980/ceterisparibus-uy"
const FILE_PATH = "data/novillo.json";
exports.schedule = "@daily";

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function periodoActual() {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const now = new Date();
  return `${meses[now.getMonth()]} ${now.getFullYear()}`;
}

function extractNovillo(text) {
  // Buscar el patron del informe: "marzo 2026" seguido de "Novillo Tipo (NT)" y el valor
  const match1 = text.match(/(\w+)\s+(\d{4})\s+Novillo\s+Tipo[^\d]+([\d\.]+)\s+([\d,]+)/i);
  if (match1) {
    return {
      periodo: `${match1[1]} ${match1[2]}`,
      valor: parseFloat(match1[4].replace(/\./g, "").replace(",", ".")),
      variacion: parseFloat(match1[3].replace(",", "."))
    };
  }

  // Buscar valor directo "1.976" o "1976" en el contexto del dato mensual
  const match2 = text.match(/DATO\s+MENSUAL[\s\S]{0,100}?(\d[\.\d]{3,})\s+([\d,]+)/i);
  if (match2) {
    return {
      periodo: periodoActual(),
      valor: parseFloat(match2[1].replace(".", "")),
      variacion: parseFloat(match2[2].replace(",", "."))
    };
  }

  return null;
}

async function getFileSha() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
  try {
    const res = await fetchUrl(url + `?t=${Date.now()}`);
    const json = JSON.parse(res);
    return json.sha || null;
  } catch {
    return null;
  }
}

async function updateGitHub(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
  const body = JSON.stringify({
    message: `[bot] Actualiza Novillo Tipo 2.0 - ${data.periodo}`,
    content,
    ...(sha ? { sha } : {})
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      method: "PUT",
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "netlify-function",
        "Content-Length": Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async () => {
  try {
    console.log("Fetching INAC PDF...");
    const pdfText = await fetchUrl("https://www.inac.uy/innovaportal/file/21474/1/informe-novillo-tipo-2.0.pdf");
    
    const novillo = extractNovillo(pdfText);
    if (!novillo) {
      return { statusCode: 500, body: "No se pudo extraer el dato del Novillo Tipo 2.0" };
    }

    console.log("Dato extraído:", novillo);

    const sha = await getFileSha();
    const payload = {
      ...novillo,
      fuente: "INAC",
      url: "https://www.inac.uy/innovaportal/v/21477/10/innova.front/novillo-tipo-20",
      actualizado: new Date().toISOString()
    };

    await updateGitHub(payload, sha);
    return { statusCode: 200, body: JSON.stringify(payload) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
