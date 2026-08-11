export default async function handler(req, res) {
  // 1. Autoriser uniquement la méthode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée (POST uniquement)' });
  }

  const { apiKey, to, subject, html } = req.body || {};

  // 2. Vérification des paramètres requis
  if (!apiKey || !to) {
    return res.status(400).json({ error: 'Clé API Resend et destinataire requis.' });
  }

  try {
    // 3. Appel de serveur à serveur vers l'API Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Expéditeur de test par défaut Resend
        to: Array.isArray(to) ? to : [to],
        subject: subject || 'Message de votre Agent IA',
        html: html || '<p>Message envoyé via l\'Agent IA.</p>'
      })
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(resendResponse.status).json({ 
        error: data.message || "Erreur renvoyée par l'API Resend" 
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("Erreur exécution Serverless Resend :", error);
    return res.status(500).json({ error: error.message || "Erreur interne du serveur." });
  }
}