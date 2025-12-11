const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
ensureDataFile();

// Servir front-end estático
app.use(express.static(path.join(__dirname)));

app.get('/data', (req, res) => {
  try {
    ensureDataFile();
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    console.log('GET /data - Dados carregados:', {
      areasCount: Object.keys(data.areas || {}).reduce((sum, floor) => sum + (data.areas[floor]?.length || 0), 0),
      hasImages: !!data.plantImages?.[1] || !!data.plantImages?.[2]
    });
    res.json(data);
  } catch (err) {
    console.error('Erro ao ler dados:', err);
    res.status(500).json({ error: 'Erro ao ler dados', details: err.message });
  }
});

app.post('/data', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.areas || !body.plantImages) {
      return res.status(400).json({ error: 'Payload inválido' });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
    console.log('POST /data - Dados salvos:', {
      areasCount: Object.keys(body.areas || {}).reduce((sum, floor) => sum + (body.areas[floor]?.length || 0), 0),
      hasImages: !!body.plantImages?.[1] || !!body.plantImages?.[2]
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar dados:', err);
    res.status(500).json({ error: 'Erro ao salvar dados', details: err.message });
  }
});

// Exportar para Vercel (serverless)
module.exports = app;

// Para desenvolvimento local
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
  });
}

