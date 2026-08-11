// Si tu utilises Express dans ton serveur Node.js :
app.post('/api/send-email', async (req, res) => {
  const { apiKey, to, subject, html } = req.body;

  if (!apiKey || !to) {
    return res.status(400).json({ error: "Clé API ou destinataire manquant." });
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
      return res.status(resendResponse.status).json({ error: data.message || "Erreur Resend" });
    }

    return res.json(data);
  } catch (error) {
    console.error("Erreur serveur Resend :", error);
    return res.status(500).json({ error: "Erreur interne lors de l'envoi de l'email." });
  }
});