// ===================================================
// 1. GESTION DU LOCAL STORAGE POUR LES CLÉS API
// ===================================================
const KEYS_STORAGE_KEY = 'chatbot_ia_agent_keys';

const keyGmailUserInput = document.getElementById('keyGmailUser');
const keyGmailAppInput = document.getElementById('keyGmailApp');
const keyResendInput = document.getElementById('keyResend');
const keyCalendarInput = document.getElementById('keyCalendar');
const keySpotifyInput = document.getElementById('keySpotify');
const keyWebhooksInput = document.getElementById('keyWebhooks');

const saveKeysBtn = document.getElementById('saveKeysBtn');
const clearKeysBtn = document.getElementById('clearKeysBtn');
const keysStatusBadge = document.getElementById('keysStatusBadge');

function loadSavedKeys() {
  const saved = localStorage.getItem(KEYS_STORAGE_KEY);
  if (!saved) return;

  try {
    const keys = JSON.parse(saved);
    if (keys.gmailUser && keyGmailUserInput) keyGmailUserInput.value = keys.gmailUser;
    if (keys.gmailApp && keyGmailAppInput) keyGmailAppInput.value = keys.gmailApp;
    if (keys.resend && keyResendInput) keyResendInput.value = keys.resend;
    if (keys.calendar && keyCalendarInput) keyCalendarInput.value = keys.calendar;
    if (keys.spotify && keySpotifyInput) keySpotifyInput.value = keys.spotify;
    if (keys.webhooks && keyWebhooksInput) keyWebhooksInput.value = keys.webhooks;
    updateBadge();
  } catch (e) {
    console.error("Erreur lors de la lecture des clés API depuis localStorage:", e);
  }
}

function getSavedKeys() {
  const saved = localStorage.getItem(KEYS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : {};
}

function getActiveKeysSummary() {
  const keys = getSavedKeys();
  const activeServices = [];

  if (keys.gmailUser && keys.gmailApp) activeServices.push("Gmail (Connecté)");
  if (keys.resend) activeServices.push("Resend Email (Connecté)");
  if (keys.calendar) activeServices.push("Google Calendar (Token présent)");
  if (keys.spotify) activeServices.push("Spotify (Token présent)");
  if (keys.webhooks) activeServices.push(`Webhook Zapier/Make (${keys.webhooks})`);

  return {
    count: activeServices.length,
    text: activeServices.length > 0 
      ? `Services connectés et disponibles : ${activeServices.join(', ')}.`
      : "Aucun service connecté."
  };
}

function updateBadge() {
  const summary = getActiveKeysSummary();
  if (keysStatusBadge) keysStatusBadge.textContent = `${summary.count} connecté(s)`;
}

saveKeysBtn.addEventListener('click', () => {
  const keys = {
    gmailUser: keyGmailUserInput ? keyGmailUserInput.value.trim() : '',
    gmailApp: keyGmailAppInput ? keyGmailAppInput.value.trim() : '',
    resend: keyResendInput ? keyResendInput.value.trim() : '',
    calendar: keyCalendarInput ? keyCalendarInput.value.trim() : '',
    spotify: keySpotifyInput ? keySpotifyInput.value.trim() : '',
    webhooks: keyWebhooksInput ? keyWebhooksInput.value.trim() : ''
  };

  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  updateBadge();
  alert("✅ Clés et tokens sauvegardés avec succès dans votre navigateur.");
});

clearKeysBtn.addEventListener('click', () => {
  if (confirm("Voulez-vous vraiment effacer toutes vos clés enregistrées ?")) {
    localStorage.removeItem(KEYS_STORAGE_KEY);
    if (keyGmailUserInput) keyGmailUserInput.value = '';
    if (keyGmailAppInput) keyGmailAppInput.value = '';
    if (keyResendInput) keyResendInput.value = '';
    if (keyCalendarInput) keyCalendarInput.value = '';
    if (keySpotifyInput) keySpotifyInput.value = '';
    if (keyWebhooksInput) keyWebhooksInput.value = '';
    updateBadge();
  }
});


// ===================================================
// 2. FONCTIONS D'APPEL VERS LES ROUTES SERVEUR /API
// ===================================================
async function sendGmailEmail(gmailUser, appPassword, toEmail, subject, textContent) {
  try {
    const res = await fetch('/api/send-gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gmailUser: gmailUser,
        appPassword: appPassword,
        to: toEmail,
        subject: subject || 'Message de votre Agent IA',
        html: `<p>${textContent}</p>`
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'envoi Gmail");

    return { success: true, id: data.messageId };
  } catch (err) {
    console.error("Erreur Gmail :", err);
    return { success: false, error: err.message };
  }
}

async function sendResendEmail(apiKey, toEmail, subject, textContent) {
  try {
    const res = await fetch('/api/send-resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey,
        to: toEmail,
        subject: subject || 'Message de votre Agent IA',
        html: `<p>${textContent}</p>`
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'envoi Resend");

    return { success: true, id: data.id };
  } catch (err) {
    console.error("Erreur Resend :", err);
    return { success: false, error: err.message };
  }
}

async function callCalendarApi(accessToken, action, params = {}) {
  try {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: accessToken,
        action: action, ...params
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur Google Calendar");

    return { success: true, data: data };
  } catch (err) {
    console.error("Erreur Calendar :", err);
    return { success: false, error: err.message };
  }
}

// ===================================================
// 3. CONTROLES VOCAUX ET SYNTHÈSE VOCALE
// ===================================================
const agentUserInput = document.getElementById('agentUserInput');
const agentSendBtn = document.getElementById('agentSendBtn');
const micBtn = document.getElementById('micBtn');
const stopBtn = document.getElementById('stopBtn');
const agentChatLog = document.getElementById('agentChatLog');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    agentUserInput.value = transcript;
    handleAgentSend();
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.textContent = '🎤 Écouter';
  };
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    stopSpeech();
    recognition.start();
    isListening = true;
    micBtn.textContent = '🔴 Écoute...';
  }
});

function speak(text) {
  stopSpeech();
  if ('speechSynthesis' in window) {
    const cleanedText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }
}

function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

stopBtn.addEventListener('click', () => {
  stopSpeech();
  if (recognition && isListening) {
    recognition.stop();
  }
});

function cleanTextForSpeech(text) {
  if (!text) return '';

  return text
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[-*_=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


// ===================================================
// 4. AFFICHAGE DU CHAT
// ===================================================
function appendMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = role === 'Utilisateur' ? 'user-msg' : (role === 'Système' ? 'sys-msg' : 'ai-msg');
  msgDiv.innerHTML = `<strong>${role} :</strong> ${text}`;
  agentChatLog.appendChild(msgDiv);
  agentChatLog.scrollTop = agentChatLog.scrollHeight;
}

function showThinking() {
  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'agentThinking';
  thinkingDiv.className = 'ai-msg thinking-msg';
  thinkingDiv.innerHTML = `Agent en cours d'exécution<span class="dots"><span>.</span><span>.</span><span>.</span></span>`;
  agentChatLog.appendChild(thinkingDiv);
  agentChatLog.scrollTop = agentChatLog.scrollHeight;
}

function removeThinking() {
  const thinkingDiv = document.getElementById('agentThinking');
  if (thinkingDiv) thinkingDiv.remove();
}


// ===================================================
// 5. EXÉCUTION DE L'ORDRE
// ===================================================
async function handleAgentSend() {
  const prompt = agentUserInput.value.trim();
  if (!prompt) return;

  stopSpeech();
  appendMessage('Utilisateur', prompt);
  agentUserInput.value = '';

  agentSendBtn.disabled = true;
  showThinking();

  const keys = getSavedKeys();
  const selectElement = document.getElementById('agentModelSelect');
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const providerStr = selectedOption.getAttribute('data-provider');

  // Recherche si une adresse mail est présente dans le message
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const foundEmails = prompt.match(emailRegex);

  // OPTION A : Envoi via Gmail (Prioritaire si clés Gmail renseignées)
  if (keys.gmailUser && keys.gmailApp && foundEmails && foundEmails.length > 0) {
    const targetEmail = foundEmails[0];
    
    const result = await sendGmailEmail(
      keys.gmailUser, 
      keys.gmailApp, 
      targetEmail, 
      "Message de votre Agent IA", 
      prompt
    );

    removeThinking();

    if (result.success) {
      const msg = `✅ E-mail envoyé avec succès à <strong>${targetEmail}</strong> via Gmail !`;
      appendMessage('IA Agent', msg);
      speak(`E-mail envoyé avec succès à ${targetEmail}`);
    } else {
      const msg = `❌ Échec de l'envoi via Gmail : ${result.error}`;
      appendMessage('IA Agent', msg);
      speak("Une erreur est survenue lors de l'envoi de l'e-mail.");
    }

    agentSendBtn.disabled = false;
    return;
  }

  // OPTION B : Envoi via Resend (si clé Resend renseignée)
  if (keys.resend && foundEmails && foundEmails.length > 0) {
    const targetEmail = foundEmails[0];
    
    const result = await sendResendEmail(
      keys.resend, 
      targetEmail, 
      "Message de votre Agent IA", 
      prompt
    );

    removeThinking();

    if (result.success) {
      const msg = `✅ E-mail envoyé avec succès à <strong>${targetEmail}</strong> via Resend !`;
      appendMessage('IA Agent', msg);
      speak(`E-mail envoyé avec succès à ${targetEmail}`);
    } else {
      const msg = `❌ Échec de l'envoi via Resend : ${result.error}`;
      appendMessage('IA Agent', msg);
      speak("Une erreur est survenue lors de l'envoi de l'e-mail.");
    }

    agentSendBtn.disabled = false;
    return;
  }

    const lowerPrompt = prompt.toLowerCase();

    // ----------------------------------------------------
    // ACTION GOOGLE CALENDAR : CONSULTATION OU CRÉATION
    // ----------------------------------------------------
    if (keys.calendar && (lowerPrompt.includes('agenda') || lowerPrompt.includes('rendez-vous') || lowerPrompt.includes('événement'))) {

    // Cas 1 : Récupérer / Voir l'agenda
    if (lowerPrompt.includes('voir') || lowerPrompt.includes('mon agenda') || lowerPrompt.includes('prochain')) {
        const result = await callCalendarApi(keys.calendar, 'list');
        removeThinking();

        if (result.success) {
        const events = result.data.events;
        if (events.length === 0) {
            appendMessage('IA Agent', "📅 Aucun événement à venir trouvé dans votre agenda.");
            speak("Aucun événement à venir.");
        } else {
            let textList = "📅 **Vos prochains événements :**<br>";
            events.forEach(ev => {
            const dateStr = new Date(ev.start.dateTime || ev.start.date).toLocaleString('fr-FR');
            textList += `- **${ev.summary}** (${dateStr})<br>`;
            });
            appendMessage('IA Agent', textList);
            speak("Voici vos prochains événements.");
        }
        } else {
        appendMessage('IA Agent', `❌ Échec Calendar : ${result.error}`);
        }

        agentSendBtn.disabled = false;
        return; // STOPPE L'EXÉCUTION
    }
    }

  // OPTION C : Discussion classique avec le modèle IA
  const servicesSummary = getActiveKeysSummary();
  const agentContext = `
        [CONTEXTE AGENT ET INTEGRATIONS]
        ${servicesSummary.text}

        Réponds directement et poliment à l'utilisateur au sujet de son instruction.
        `;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        context: agentContext,
        model: selectElement.value,
        provider: providerStr
      })
    });

    if (!response.ok) throw new Error("Erreur serveur API");

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    removeThinking();
    appendMessage('IA Agent', aiMessage);
    speak(aiMessage);

  } catch (error) {
    console.error("Erreur Agent :", error);
    removeThinking();
    appendMessage('Système', 'Erreur lors de l\'exécution de l\'ordre.');
  } finally {
    agentSendBtn.disabled = false;
  }
}

// Initialisation des écouteurs
agentSendBtn.addEventListener('click', handleAgentSend);
agentUserInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleAgentSend();
});

loadSavedKeys();