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
        currentPlant: 'clinica',
        currentFloor: 1,
        plants: {
          clinica: {
            name: 'Clínica',
            floors: [
              { id: 1, name: '1º Andar' },
              { id: 2, name: '2º Andar' },
              { id: 3, name: '3º Andar - Casa de Máquinas' }
            ],
            areas: { 1: [], 2: [], 3: [] },
            plantImages: { 1: null, 2: null, 3: null }
          },
          csc: {
            name: 'CSC - Angelus',
            floors: [
              { id: 1, name: '1º Andar' },
              { id: 2, name: '2º Andar' }
            ],
            areas: { 1: [], 2: [] },
            plantImages: { 1: null, 2: null }
          }
        }
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
      currentPlant: data.currentPlant,
      clinicaAreasCount: Object.keys(data.plants?.clinica?.areas || {}).reduce((sum, floor) => sum + (data.plants?.clinica?.areas[floor]?.length || 0), 0),
      cscAreasCount: Object.keys(data.plants?.csc?.areas || {}).reduce((sum, floor) => sum + (data.plants?.csc?.areas[floor]?.length || 0), 0),
      hasClinicaImages: !!data.plants?.clinica?.plantImages?.[1] || !!data.plants?.clinica?.plantImages?.[2] || !!data.plants?.clinica?.plantImages?.[3],
      hasCscImages: !!data.plants?.csc?.plantImages?.[1] || !!data.plants?.csc?.plantImages?.[2] || !!data.plants?.csc?.plantImages?.[3]
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
    if (!body || !body.plants) {
      return res.status(400).json({ error: 'Payload inválido - plantas não encontradas' });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
    console.log('POST /data - Dados salvos:', {
      currentPlant: body.currentPlant,
      clinicaAreasCount: Object.keys(body.plants?.clinica?.areas || {}).reduce((sum, floor) => sum + (body.plants?.clinica?.areas[floor]?.length || 0), 0),
      cscAreasCount: Object.keys(body.plants?.csc?.areas || {}).reduce((sum, floor) => sum + (body.plants?.csc?.areas[floor]?.length || 0), 0),
      hasClinicaImages: !!body.plants?.clinica?.plantImages?.[1] || !!body.plants?.clinica?.plantImages?.[2] || !!body.plants?.clinica?.plantImages?.[3],
      hasCscImages: !!body.plants?.csc?.plantImages?.[1] || !!body.plants?.csc?.plantImages?.[2] || !!body.plants?.csc?.plantImages?.[3]
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

