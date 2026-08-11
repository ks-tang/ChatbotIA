export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée (POST uniquement)' });
  }

  const { accessToken, action, summary, description, startDateTime, endDateTime } = req.body || {};

  if (!accessToken) {
    return res.status(400).json({ error: 'Token d\'accès Google Calendar requis.' });
  }

  try {
    // ACTION 1 : Créer un événement
    if (action === 'create') {
      if (!summary || !startDateTime || !endDateTime) {
        return res.status(400).json({ error: 'Titre (summary), heure de début et heure de fin requis.' });
      }

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: summary,
          description: description || 'Ajouté par votre Agent IA',
          start: { dateTime: startDateTime, timeZone: 'Europe/Paris' },
          end: { dateTime: endDateTime, timeZone: 'Europe/Paris' }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Erreur lors de la création de l'événement");

      return res.status(200).json({ success: true, event: data });
    }

    // ACTION 2 : Lister les événements à venir
    if (action === 'list') {
      const now = new Date().toISOString();
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=5&orderBy=startTime&singleEvents=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Erreur de récupération de l'agenda");

      return res.status(200).json({ success: true, events: data.items || [] });
    }

    return res.status(400).json({ error: 'Action non valide (utilisez "create" ou "list").' });

  } catch (error) {
    console.error("Erreur Google Calendar API :", error);
    return res.status(500).json({ error: error.message || "Erreur serveur Google Calendar." });
  }
}