const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

exports.handler = async () => {
  try {
    const apiKey = '76e4e78a92c046128cbc2f8aa685910a';
    
    // Obtener precios en paralelo
    const [sojaRes, trigoRes, arrozRes] = await Promise.all([
      fetchUrl(`https://api.twelvedata.com/quote?symbol=ZS&interval=1day&apikey=${apiKey}`),
      fetchUrl(`https://api.twelvedata.com/quote?symbol=ZW&interval=1day&apikey=${apiKey}`),
      fetchUrl(`https://api.twelvedata.com/quote?symbol=ZR&interval=1day&apikey=${apiKey}`)
    ]);
    
    const sojaData = JSON.parse(sojaRes);
    const trigoData = JSON.parse(trigoRes);
    const arrozData = JSON.parse(arrozRes);
    
    // Extraer precios y convertir si están en centavos
    const getPrecio = (data) => {
      if (!data.close) return null;
      const precio = parseFloat(data.close);
      return precio > 1000 ? precio / 100 : precio;
    };
    
    const precios = {
      soja: getPrecio(sojaData),
      trigo: getPrecio(trigoData),
      arroz: getPrecio(arrozData),
      maiz: 195 // Valor fijo Rosario
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(precios)
    };
    
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        soja: 10.50,
        trigo: 6.00,
        arroz: 18.00,
        maiz: 195
      })
    };
  }
};
