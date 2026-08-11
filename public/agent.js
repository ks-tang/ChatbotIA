// ===================================================
// GESTION DU LOCAL STORAGE POUR LES CLÉS API
// ===================================================
const KEYS_STORAGE_KEY = 'chatbot_ia_agent_keys';

const keyEmailInput = document.getElementById('keyEmail');
const keyCalendarInput = document.getElementById('keyCalendar');
const keySpotifyInput = document.getElementById('keySpotify');
const keyWebhooksInput = document.getElementById('keyWebhooks');

const saveKeysBtn = document.getElementById('saveKeysBtn');
const clearKeysBtn = document.getElementById('clearKeysBtn');
const keysStatusBadge = document.getElementById('keysStatusBadge');

// Charger les clés sauvegardées au démarrage
function loadSavedKeys() {
  const saved = localStorage.getItem(KEYS_STORAGE_KEY);
  if (!saved) return;

  try {
    const keys = JSON.parse(saved);
    if (keys.email) keyEmailInput.value = keys.email;
    if (keys.calendar) keyCalendarInput.value = keys.calendar;
    if (keys.spotify) keySpotifyInput.value = keys.spotify;
    if (keys.webhooks) keyWebhooksInput.value = keys.webhooks;
    updateBadge();
  } catch (e) {
    console.error("Erreur lors de la lecture des clés API depuis localStorage:", e);
  }
}

function getSavedKeys() {
  const saved = localStorage.getItem(KEYS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : {};
}

// Obtenir un résumé des clés actives pour l'injecter au prompt
function getActiveKeysSummary() {
  const keys = getSavedKeys();
  const activeServices = [];

  if (keys.email) activeServices.push("Service Email Resend (Clé configurée)");
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
  keysStatusBadge.textContent = `${summary.count} connecté(s)`;
}

saveKeysBtn.addEventListener('click', () => {
  const keys = {
    email: keyEmailInput.value.trim(),
    calendar: keyCalendarInput.value.trim(),
    spotify: keySpotifyInput.value.trim(),
    webhooks: keyWebhooksInput.value.trim()
  };

  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  updateBadge();
  alert("✅ Clés et tokens sauvegardés avec succès dans votre navigateur.");
});

clearKeysBtn.addEventListener('click', () => {
  if (confirm("Voulez-vous vraiment effacer toutes vos clés enregistrées ?")) {
    localStorage.removeItem(KEYS_STORAGE_KEY);
    keyEmailInput.value = '';
    keyCalendarInput.value = '';
    keySpotifyInput.value = '';
    keyWebhooksInput.value = '';
    updateBadge();
  }
});

// ===================================================
// FONCTION D'ENVOI D'EMAIL DÉDIÉE (RESEND ET GMAIL API)
// ===================================================
async function sendResendEmail(apiKey, toEmail, subject, textContent) {
  try {
    const res = await fetch('/api/send-resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        to: toEmail,
        subject: subject || 'Message de votre Agent IA',
        html: `<p>${textContent}</p>`
      })
    });

    // On vérifie le type de contenu avant de parser le JSON
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const errorText = await res.text();
      throw new Error(`Réponse non-JSON du serveur (${res.status}) : ${errorText}`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erreur lors de l'envoi de l'email.");
    }
    return { success: true, id: data.id };
  } catch (err) {
    console.error("Erreur Resend :", err);
    return { success: false, error: err.message };
  }
}

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

// ===================================================
// BINDINGS DES BOUTONS DE CONTRÔLE (IDENTIQUES À RAG)
// ===================================================
const agentUserInput = document.getElementById('agentUserInput');
const agentSendBtn = document.getElementById('agentSendBtn');
const micBtn = document.getElementById('micBtn');
const stopBtn = document.getElementById('stopBtn');
const agentChatLog = document.getElementById('agentChatLog');

// Reconnaissance vocale
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
    const utterance = new SpeechSynthesisUtterance(text);
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

// ===================================================
// GESTION DES MESSAGES DU CHAT
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
// ENVOI DE L'ORDRE ET DÉCLENCHEMENT D'ACTIONS
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

  // Extraction d'adresse email si présente dans la demande
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const foundEmails = prompt.match(emailRegex);

  // 1. Si une clé Resend est configurée ET qu'un email est demandé
  if (keys.email && foundEmails && foundEmails.length > 0) {
    const targetEmail = foundEmails[0];
    
    // Appel direct à l'API Resend
    const result = await sendResendEmail(keys.email, targetEmail, "Message envoyé par votre Agent IA", prompt);
    removeThinking();

    if (result.success) {
      const msg = `✅ E-mail envoyé avec succès à <strong>${targetEmail}</strong> via Resend ! (ID: ${result.id})`;
      appendMessage('IA Agent', msg);
      speak(`E-mail envoyé avec succès à ${targetEmail}`);
    } else {
      const msg = `❌ Échec lors de l'envoi de l'e-mail via Resend : ${result.error}`;
      appendMessage('IA Agent', msg);
      speak("Une erreur est survenue lors de l'envoi de l'e-mail.");
    }

    agentSendBtn.disabled = false;
    return;
  }

  // 2. Sinon, traitement normal par l'IA
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

agentSendBtn.addEventListener('click', handleAgentSend);
agentUserInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleAgentSend();
});

// Initialisation
loadSavedKeys();