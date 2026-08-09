export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { message, model, provider } = req.body;

  try {
    let response;

    // 1. Si le modèle demandé est sur Groq
    if (provider === 'groq') {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: message }]
        })
      });

    // 2. Sinon, on passe par OpenRouter
    } else {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': req.headers.referer || 'https://chatbot-ia.vercel.app',
          'X-Title': 'Assistant IA Vocal',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: message }]
        })
      });
    }

    const data = await response.json();

    // Vérification de la réponse HTTP de l'API externe
    if (!response.ok) {
      console.error(`Erreur ${provider || 'openrouter'} (${response.status}):`, data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'Erreur renvoyée par le fournisseur d\'IA',
        details: data 
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erreur Serveur Vercel:', error);
    return res.status(500).json({ error: 'Erreur lors de la communication avec l\'IA' });
  }
}