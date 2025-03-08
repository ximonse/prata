const axios = require('axios');

exports.handler = async (event) => {
  // Se till att det är en POST-förfrågan
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text, voice } = JSON.parse(event.body);
    
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Text saknas' }) };
    }

    // Kontrollera textlängden - OpenAI har en gräns på 4096 tecken
    if (text.length > 4090) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: 'Texten är för lång. Maxgränsen är 4090 tecken per segment.' 
        }) 
      };
    }

    // Anropa OpenAI TTS API
    console.log(`Skickar text med ${text.length} tecken till OpenAI API`);
    
    const response = await axios({
      method: 'post',
      url: 'https://api.openai.com/v1/audio/speech',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'tts-1',
        input: text,
        voice: voice || 'alloy'
      },
      responseType: 'arraybuffer'
    });

    console.log('Svar från OpenAI API mottaget');

    // Returnera ljudfilen
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg'
      },
      body: Buffer.from(response.data).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    // Om felet kommer från OpenAI API och är i arraybuffer-format
    if (error.response?.data instanceof ArrayBuffer) {
      const decoder = new TextDecoder('utf-8');
      const errorText = decoder.decode(error.response.data);
      try {
        const errorJSON = JSON.parse(errorText);
        return {
          statusCode: error.response.status,
          body: JSON.stringify({ 
            error: errorJSON.error?.message || 'Ett fel uppstod vid anslutning till OpenAI' 
          })
        };
      } catch {
        return {
          statusCode: error.response.status,
          body: JSON.stringify({ 
            error: 'Ett fel uppstod vid anslutning till OpenAI' 
          })
        };
      }
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.response?.data?.error?.message || error.message || 'Något gick fel vid konverteringen' 
      })
    };
  }
};
