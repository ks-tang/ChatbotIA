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

// Obtenir un résumé des clés actives pour l'injecter au prompt
function getActiveKeysSummary() {
  const saved = localStorage.getItem(KEYS_STORAGE_KEY);
  if (!saved) return { count: 0, text: "Aucun service connecté." };

  const keys = JSON.parse(saved);
  const activeServices = [];

  if (keys.email) activeServices.push("Service Email (Token présent)");
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
// RECONNAISSANCE VOCALE & SYNTHÈSE (WEB SPEECH API)
// ===================================================
const agentUserInput = document.getElementById('agentUserInput');
const agentMicBtn = document.getElementById('agentMicBtn');
const agentSendBtn = document.getElementById('agentSendBtn');
const agentStopBtn = document.getElementById('agentStopBtn');
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
    handleAgentSend(); // Envoie automatiquement après la dictée
  };

  recognition.onend = () => {
    isListening = false;
    agentMicBtn.style.backgroundColor = 'var(--accent-red)';
  };
}

agentMicBtn.addEventListener('click', () => {
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
    agentMicBtn.style.backgroundColor = '#ffffff';
    agentMicBtn.style.color = '#000000';
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

agentStopBtn.addEventListener('click', () => {
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
// ENVOI DE L'ORDRE À L'API
// ===================================================
async function handleAgentSend() {
  const prompt = agentUserInput.value.trim();
  if (!prompt) return;

  stopSpeech();
  appendMessage('Utilisateur', prompt);
  agentUserInput.value = '';

  agentSendBtn.disabled = true;
  showThinking();

  const selectElement = document.getElementById('agentModelSelect');
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const providerStr = selectedOption.getAttribute('data-provider');

  // Déterminer les services connectés pour donner du contexte à l'IA
  const servicesSummary = getActiveKeysSummary();
  const agentContext = `
[CONTEXTE AGENT ET INTEGRATIONS]
${servicesSummary.text}

Si l'utilisateur demande d'effectuer une action (ex: envoyer un mail, créer un événement, jouer un morceau) :
1. Analyse si le service requis est disponible dans la liste ci-dessus.
2. Si le service est disponible, simule la réponse et explique clairement l'action qui serait déclenchée.
3. Si le webhook est configuré, indique qu'une requête HTTP POST va être envoyée.
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