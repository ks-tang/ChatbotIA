import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée (POST uniquement)' });
  }

  const { gmailUser, appPassword, to, subject, html } = req.body || {};

  if (!gmailUser || !appPassword || !to) {
    return res.status(400).json({ error: "Adresse Gmail, mot de passe d'application et destinataire requis." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: appPassword
      }
    });

    const mailOptions = {
      from: gmailUser,
      to: Array.isArray(to) ? to.join(',') : to,
      subject: subject || 'Message de votre Agent IA',
      html: html || '<p>Message envoyé via l\'Agent IA.</p>'
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error("Erreur d'envoi Gmail :", error);
    return res.status(500).json({ error: error.message || "Erreur lors de l'envoi via Gmail." });
  }
}