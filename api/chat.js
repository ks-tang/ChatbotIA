export default async function handler(req, res) {
  console.log('--- [API ROUTE INTERCEPTÉE] ---');
  console.log('Méthode HTTP:', req.method);
  console.log('Corps de la requête (body):', req.body);

  if (req.method !== 'POST') {
    console.log('❌ Erreur: Méthode non autorisée');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // 1. Récupération des paramètres (avec l'ajout de "endpoint" pour UncloseAI)
  const { message, model, provider, context, images, endpoint } = req.body;
  console.log(`Provider sélectionné: ${provider} | Modèle: ${model} | Endpoint dédié: ${endpoint || 'aucun'} | RAG Contexte présent: ${!!context} | Images: ${images?.length || 0}`);

  // 2. Construction de la liste des messages
  const messagesPayload = [];

  if (context && context.trim() !== '') {
    const systemPrompt = `Tu es un assistant IA spécialisé et rigoureux.
      Tu dois répondre à la question de l'utilisateur en te basant EXCLUSIVEMENT sur les documents de référence et/ou images fournis ci-dessous.
      Si l'information n'est pas présente dans les documents ou images, indique-le clairement à l'utilisateur sans inventer de faits.

      === DOCUMENTS DE RÉFÉRENCE ===
      ${context}`;

    messagesPayload.push({ role: 'system', content: systemPrompt });
  }

  // 3. Construction du message utilisateur (Texte + Images éventuelles)
  if (images && Array.isArray(images) && images.length > 0) {
    // Format Multimodal (Tableau d'objets content)
    const userContent = [
      { type: 'text', text: message || 'Analyse cette image.' }
    ];

    // On ajoute chaque image au format image_url
    images.forEach((imgBase64) => {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imgBase64 // Doit être sous la forme "data:image/png;base64,..."
        }
      });
    });

    messagesPayload.push({ role: 'user', content: userContent });
  } else {
    // Format Standard (Texte brut)
    messagesPayload.push({ role: 'user', content: message });
  }

  try {
    let response;

    // --- BRANCHE GROQ ---
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

    // --- BRANCHE UNCLOSEAI ---
    } else if (provider === 'uncloseai') {
      const baseUrl = endpoint || 'https://hermes.ai.unturf.com/v1';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const targetUrl = `${cleanBaseUrl}/chat/completions`;

      // Détermination intelligente du modèle par défaut si l'option passe un nom simplifié
      let targetModel = model;
      if (!targetModel || targetModel === 'hermes') {
        targetModel = 'adamo1139/Hermes-3-Llama-3.1-8B-FP8-Dynamic';
      } else if (targetModel === 'qwen') {
        targetModel = 'hf.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF:Q4_K_M';
      }

      console.log(`Appel UncloseAI vers : ${targetUrl} (Modèle: ${targetModel})...`);

      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-api-key', // Clé fictive requise par les endpoints Unturf
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          model: targetModel,
          messages: messagesPayload,
          temperature: 0.5,
          max_tokens: 1000
        })
      });

    // --- BRANCHE OPENROUTER (PAR DÉFAUT) ---
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
          model: model || 'openai/gpt-oss-20b:free',
          messages: messagesPayload
        })
      });
    }

    console.log(`Statut HTTP du provider (${provider}):`, response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur renvoyée par le provider:', JSON.stringify(data, null, 2));
      return res.status(response.status).json({ 
        error: data.error?.message || data.message || 'Erreur renvoyée par le fournisseur d\'IA',
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