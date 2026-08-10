// Récupération des éléments DOM
const modelSelect = document.getElementById('modelSelect');
const chatLog = document.getElementById('chatLog');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const stopBtn = document.getElementById('stopBtn');

function appendMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'Utilisateur' ? 'user-msg' : 'ai-msg';
  msgDiv.textContent = `${sender}: ${text}`;
  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Fonction utilitaire pour stopper la synthèse vocale à tout moment
function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Affiche une bulle d'attente animée
function showThinking() {
  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'thinkingBubble';
  thinkingDiv.className = 'ai-msg thinking-msg';
  thinkingDiv.innerHTML = `IA: Réflexion en cours<span class="dots"><span>.</span><span>.</span><span>.</span></span>`;
  chatLog.appendChild(thinkingDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Supprime la bulle d'attente
function removeThinking() {
  const thinkingDiv = document.getElementById('thinkingBubble');
  if (thinkingDiv) {
    thinkingDiv.remove();
  }
}

// L'utilisateur envoie un message 
async function sendToAI(promptText) {
  stopSpeech();

  const selectElement = document.getElementById('modelSelect');
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  
  const selectedModel = selectedOption.value;
  const provider = selectedOption.getAttribute('data-provider');

  console.log('--- [ENVOI DE LA REQUÊTE] ---');
  console.log('Prompt:', promptText);
  console.log('Modèle:', selectedModel);
  console.log('Provider:', provider);

  appendMessage('Utilisateur', promptText);

  showThinking();

  try {
    console.log('Envoi de la requête POST vers /api/chat...');
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: promptText,
        model: selectedModel,
        provider: provider
      })
    });

    console.log('Statut HTTP /api/chat:', response.status);

    const data = await response.json();
    removeThinking();
    console.log('Réponse reçue du serveur:', data);

    if (response.ok && data.choices && data.choices[0]) {
      const reply = data.choices[0].message.content;
      appendMessage('IA', reply);
      speak(reply);
    } else {
      console.warn('⚠️ La réponse ne contient pas de choix valide ou comporte une erreur:', data);
      
      let friendlyError = 'L\'IA sélectionnée est indisponible.';

      if (response.status === 429) {
        friendlyError = 'Ce modèle gratuit est temporairement surchargé. Réessayez dans une minute ou changez de modèle.';
      } else if (data.error) {
        friendlyError = data.error;
      }
      
      appendMessage('Système', friendlyError);
      speak(friendlyError);
    }

  } catch (error) {
    console.error('❌ Erreur Fetch côté client:', error);
    appendMessage('Système', 'Erreur lors de la communication avec le serveur.');
  }
}

// Fonction de synthèse vocale, lire la réponse de l'IA
function speak(text) {
  if ('speechSynthesis' in window) {
    stopSpeech(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }
}

// Bouton Stop : stoppe la synthèse vocale immédiatement
stopBtn.addEventListener('click', stopSpeech);

// Reconnaissance vocale
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';

  micBtn.addEventListener('click', () => {
    // Coupe la voix de l'IA dès qu'on clique sur le micro pour écouter
    stopSpeech();
    
    recognition.start();
    micBtn.textContent = '🎙️ Écoute...';
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    micBtn.textContent = '🎤 Écouter';
    sendToAI(transcript);
  };

  recognition.onerror = () => { micBtn.textContent = '🎤 Écouter'; };
} else {
  micBtn.disabled = true;
  micBtn.textContent = 'Micro non supporté';
}

sendBtn.addEventListener('click', () => {
  if (userInput.value.trim() !== '') {
    sendToAI(userInput.value);
    userInput.value = '';
  }
});