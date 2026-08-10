export default async function handler(req, res) {
  console.log('--- [API ROUTE INTERCEPTÉE] ---');
  console.log('Méthode HTTP:', req.method);
  console.log('Corps de la requête (body):', req.body);

  if (req.method !== 'POST') {
    console.log('❌ Erreur: Méthode non autorisée');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // 1. Récupération du paramètre context
  const { message, model, provider, context } = req.body;
  console.log(`Provider sélectionné: ${provider} | Modèle: ${model} | RAG Contexte présent: ${!!context}`);

  // 2. Construction de la liste des messages avec System Prompt si RAG
  const messagesPayload = [];

  if (context && context.trim() !== '') {
    const systemPrompt = `Tu es un assistant IA spécialisé et rigoureux.
Tu dois répondre à la question de l'utilisateur en te basant EXCLUSIVEMENT sur les documents de référence fournis ci-dessous.
Si l'information n'est pas présente dans les documents, indique-le clairement à l'utilisateur sans inventer de faits.

=== DOCUMENTS DE RÉFÉRENCE ===
${context}`;

    messagesPayload.push({ role: 'system', content: systemPrompt });
  }

  messagesPayload.push({ role: 'user', content: message });

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
          messages: messagesPayload
        })
      });
    } else {
      console.log('Appel à l\'API OpenRouter...');
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': req.headers.referer || 'https://chatbot-ia.vercel.app',
          'X-Title': 'ChatbotIA - RAG System',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'google/gemma-4-26b-a4b-it:free',
          messages: messagesPayload
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