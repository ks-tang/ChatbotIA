export default async function handler(req, res) {
  console.log('--- [API ROUTE INTERCEPTÉE] ---');
  console.log('Méthode HTTP:', req.method);
  console.log('Corps de la requête (body):', req.body);

  if (req.method !== 'POST') {
    console.log('❌ Erreur: Méthode non autorisée');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { message, model, provider } = req.body;
  console.log(`Provider sélectionné: ${provider} | Modèle: ${model}`);

  try {
    let response;

    if (provider === 'groq') {
      console.log('Appel à l\'API Groq...');
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
    } else {
      console.log('Appel à l\'API OpenRouter...');
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

    console.log(`Statut HTTP du provider (${provider}):`, response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur renvoyée par le provider:', JSON.stringify(data, null, 2));
      return res.status(response.status).json({ 
        error: data.error?.message || 'Erreur renvoyée par le fournisseur d\'IA',
        details: data 
      });
    }

    console.log('✅ Réponse IA reçue avec succès');
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Exception serveur Vercel:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la communication avec l\'IA' });
  }
}