const fs = require('fs');
const path = require('path');

// No Vercel, usa /tmp para escrita ou a raiz do projeto
const DATA_FILE = path.join(__dirname, '..', 'data.json');

// Garante que existe um arquivo inicial
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        currentFloor: 1,
        areas: { 1: [], 2: [] },
        plantImages: { 1: null, 2: null }
      }, null, 2)
    );
  }
}

module.exports = async (req, res) => {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  ensureDataFile();
  
  if (req.method === 'GET') {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      console.log('GET /api/data - Dados carregados');
      res.json(data);
    } catch (err) {
      console.error('Erro ao ler dados:', err);
      res.status(500).json({ error: 'Erro ao ler dados', details: err.message });
    }
  } else if (req.method === 'POST') {
    try {
      const body = req.body;
      if (!body || !body.areas || !body.plantImages) {
        return res.status(400).json({ error: 'Payload inválido' });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
      console.log('POST /api/data - Dados salvos');
      res.json({ ok: true });
    } catch (err) {
      console.error('Erro ao salvar dados:', err);
      res.status(500).json({ error: 'Erro ao salvar dados', details: err.message });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
};

