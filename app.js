const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const chatLog = document.getElementById('chatLog');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');

// 1. Charger la clé API sauvegardée
apiKeyInput.value = localStorage.getItem('groq_api_key') || '';
saveKeyBtn.addEventListener('click', () => {
  localStorage.setItem('groq_api_key', apiKeyInput.value);
  alert('Clé API enregistrée localement !');
});

// 2. Fonction pour afficher les messages
function appendMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'Utilisateur' ? 'user-msg' : 'ai-msg';
  msgDiv.textContent = `${sender}: ${text}`;
  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// 3. Appel à l'API Groq (Gratuite et ultra-rapide)
async function sendToAI(promptText) {
  const apiKey = localStorage.getItem('groq_api_key');
  if (!apiKey) {
    alert('Veuillez d\'abord ajouter votre clé API Groq.');
    return;
  }

  appendMessage('Utilisateur', promptText);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: promptText }]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;
    
    appendMessage('IA', reply);
    speak(reply); // L'IA parle
  } catch (error) {
    console.error(error);
    appendMessage('Système', 'Erreur lors de la communication avec l\'IA.');
  }
}

// 4. Synthèse vocale (L'IA parle)
function speak(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }
}

// 5. Reconnaissance vocale (Écoute le micro)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';

  micBtn.addEventListener('click', () => {
    recognition.start();
    micBtn.textContent = '🎙️ Écoute en cours...';
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    micBtn.textContent = '🎤 Écouter';
    sendToAI(transcript);
  };

  recognition.onerror = () => {
    micBtn.textContent = '🎤 Écouter';
  };
} else {
  micBtn.disabled = true;
  micBtn.textContent = 'Micro non supporté';
}

// Événement clic sur le bouton Envoyer
sendBtn.addEventListener('click', () => {
  if (userInput.value.trim() !== '') {
    sendToAI(userInput.value);
    userInput.value = '';
  }
});