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

    // Anropa OpenAI TTS API
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Något gick fel vid konverteringen' })
    };
  }
};
