// Flyttad till korrekt plats som netlify/functions/test-endpoint.js
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Test-endpointen fungerar!",
      received: event.body ? JSON.parse(event.body) : {},
      hasAPIKey: process.env.OPENAI_API_KEY ? "Ja" : "Nej",
      environment: process.env.NODE_ENV
    })
  };
};
