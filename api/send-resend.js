export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée (POST uniquement)' });
  }

  const { apiKey, to, subject, html } = req.body || {};

  if (!apiKey || !to) {
    return res.status(400).json({ error: 'Clé API Resend et destinataire requis.' });
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
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

    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    console.error("Erreur exécution Serverless Resend :", error);
    return res.status(500).json({ error: error.message || "Erreur interne du serveur." });
  }
}