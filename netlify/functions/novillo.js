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

function extractNovillo(text) {
  // Busca patron: numero de 4 digitos seguido de variacion porcentual
  const match = text.match(/DATO MENSUAL[\s\S]*?(\w+\s+\d{4})\s*Novillo Tipo \(NT\)[\s\S]*?(\d[\d\.]+)\s+([\d\.,]+)/);
  if (match) {
    return {
      periodo: match[1].trim(),
      valor: parseFloat(match[3].replace(",", ".")),
      variacion: parseFloat(match[2])
    };
  }
  // Patron alternativo mas simple
  const match2 = text.match(/marzo\s+(\d{4})[\s\S]*?Novillo Tipo \(NT\)[\s\S]*?Var NT \(%\)\s*([\d\.]+)\s*([\d\.]+)/);
  if (match2) {
    return {
      periodo: `marzo ${match2[1]}`,
      valor: parseFloat(match2[3]),
      variacion: parseFloat(match2[2])
    };
  }
  // Busqueda directa del valor 1.976 o similar (4 digitos con punto)
  const match3 = text.match(/(\d{1,2}\/\d{2}\/\d{4}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})[\s\S]{0,200}?(\d\.\d{3})\s+([\d,]+)/i);
  if (match3) {
    return {
      periodo: `${match3[1]} ${match3[2]}`,
      valor: parseFloat(match3[3].replace(".", "")),
      variacion: parseFloat(match3[4].replace(",", "."))
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
