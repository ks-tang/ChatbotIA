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

// L'utilisateur envoie un message 
async function sendToAI(promptText) {
  const selectElement = document.getElementById('modelSelect');
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  
  const selectedModel = selectedOption.value;
  const provider = selectedOption.getAttribute('data-provider');

  console.log('--- [ENVOI DE LA REQUÊTE] ---');
  console.log('Prompt:', promptText);
  console.log('Modèle:', selectedModel);
  console.log('Provider:', provider);

  appendMessage('Utilisateur', promptText);

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
      console.log('Réponse reçue du serveur:', data);

      if (response.ok && data.choices && data.choices[0]) {
        const reply = data.choices[0].message.content;
        appendMessage('IA', reply);
        speak(reply);
      } else {
        console.warn('⚠️ La réponse ne contient pas de choix valide ou comporte une erreur:', data);
        
        // Variable pour stocker le message d'erreur final
        let friendlyError = 'L\'IA sélectionnée est indisponible.';

        // if erreur 429
        if (response.status === 429) {
          friendlyError = 'Ce modèle gratuit est temporairement surchargé. Réessayez dans une minute ou changez de modèle.';
        } else if (data.error) {
          friendlyError = data.error;
        }
        
        // On affiche la variable friendlyError
        appendMessage('Système', friendlyError);
        speak(friendlyError);
      }

    } catch (error) {
      console.error('❌ Erreur Fetch côté client:', error);
      appendMessage('Système', 'Erreur lors de la communication avec le serveur.');
    }
  }

// Synthèse vocale
function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }
}

// Bouton Stop : stoppe la synthèse vocale immédiatement
stopBtn.addEventListener('click', () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
});

// Reconnaissance vocale
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';

  micBtn.addEventListener('click', () => {
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