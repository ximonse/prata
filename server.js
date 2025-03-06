require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Tillåt CORS för din GitHub Pages domän
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://[ditt-användarnamn].github.io'
}));

app.use(express.json());

// Endpoint för text-till-tal
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text är obligatorisk' });
    }

    // Använd miljövariabel för API-nyckeln
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API-nyckel är inte konfigurerad på servern' });
    }

    // Gör anropet till OpenAI API
    const response = await axios({
      method: 'post',
      url: 'https://api.openai.com/v1/audio/speech',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'tts-1',
        input: text,
        voice: voice || 'alloy'
      },
      responseType: 'arraybuffer'
    });

    // Skicka audio-datan tillbaka till klienten
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    // Om felet kommer från OpenAI API och är i arraybuffer-format
    if (error.response?.data instanceof ArrayBuffer) {
      const decoder = new TextDecoder('utf-8');
      const errorText = decoder.decode(error.response.data);
      try {
        const errorJSON = JSON.parse(errorText);
        return res.status(error.response.status).json({ 
          error: errorJSON.error?.message || 'Ett fel uppstod vid anslutning till OpenAI' 
        });
      } catch {
        return res.status(error.response.status).json({ 
          error: 'Ett fel uppstod vid anslutning till OpenAI' 
        });
      }
    }
    
    res.status(500).json({ 
      error: error.response?.data?.error?.message || error.message || 'Ett serverfel uppstod' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server kör på port ${PORT}`);
});
