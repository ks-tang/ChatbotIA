// Éléments DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const ragChatLog = document.getElementById('ragChatLog');
const ragUserInput = document.getElementById('ragUserInput');
const ragSendBtn = document.getElementById('ragSendBtn');
const micBtn = document.getElementById('micBtn');
const stopBtn = document.getElementById('stopBtn');

// Stockage temporaire des fichiers côté client
let uploadedFiles = [];

// Gestion du clic pour parcourir les fichiers
browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

// Gestion du Drag and Drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

// Traitement des fichiers ajoutés
function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!uploadedFiles.some(f => f.name === file.name)) {
      uploadedFiles.push(file);
    }
  });
  updateFileListUI();
}

// Mise à jour de la liste dans l'interface
function updateFileListUI() {
  fileList.innerHTML = '';
  fileCount.textContent = uploadedFiles.length;

  if (uploadedFiles.length === 0) {
    fileList.innerHTML = '<li class="empty-file-item">Aucun document chargé pour le moment.</li>';
    return;
  }

  uploadedFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.innerHTML = `
      <span class="file-name">📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
      <span class="file-remove" onclick="removeFile(${index})">✕</span>
    `;
    fileList.appendChild(li);
  });
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  updateFileListUI();
}

function appendRagMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'Utilisateur' ? 'user-msg' : 'ai-msg';
  msgDiv.textContent = `${sender}: ${text}`;
  
  ragChatLog.appendChild(msgDiv);
  ragChatLog.scrollTop = ragChatLog.scrollHeight;
}

// Nettoyage Markdown pour la voix
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

// Fonction pour lire un fichier texte brut
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file, 'UTF-8');
  });
}

// Indiquer le worker à PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Extraction PDF
async function readPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n` + pageText + '\n\n';
  }

  return fullText;
}

// Extraire tout le texte des fichiers
async function extractTextFromFiles(files) {
  let combinedContext = '';
  for (const file of files) {
    let text = '';
    if (file.name.endsWith('.pdf')) {
      text = await readPdfFile(file);
    } else {
      text = await readTextFile(file);
    }
    combinedContext += `\n=== SOURCE: ${file.name} ===\n${text}\n`;
  }
  return combinedContext;
}

// Stopper la voix
function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Bulle de réflexion
function showThinking() {
  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'thinkingBubble';
  thinkingDiv.className = 'ai-msg thinking-msg';
  thinkingDiv.innerHTML = `IA: Réflexion en cours<span class="dots"><span>.</span><span>.</span><span>.</span></span>`;
  ragChatLog.appendChild(thinkingDiv);
  ragChatLog.scrollTop = ragChatLog.scrollHeight;
}

function removeThinking() {
  const thinkingDiv = document.getElementById('thinkingBubble');
  if (thinkingDiv) thinkingDiv.remove();
}

// Synthèse vocale
function speak(text) {
  if ('speechSynthesis' in window) {
    stopSpeech(); 
    const cleanedText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  }
}

// Fonction principale pour envoyer la question
async function handleSend() {
  const userPrompt = ragUserInput.value.trim();
  if (!userPrompt) return;

  if (uploadedFiles.length === 0) {
    alert("Veuillez d'abord ajouter au moins un document.");
    return;
  }

  stopSpeech();
  appendRagMessage('Utilisateur', userPrompt);
  ragUserInput.value = '';
  
  ragSendBtn.disabled = true;
  showThinking();

  try {
    const extractedContext = await extractTextFromFiles(uploadedFiles);

    const selectElement = document.getElementById('ragModelSelect');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const providerStr = selectedOption.getAttribute('data-provider');

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userPrompt,
        context: extractedContext,
        model: selectElement.value,
        provider: providerStr 
      })
    });

    if (!response.ok) throw new Error("Erreur serveur API");

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    removeThinking();
    appendRagMessage('IA', aiMessage);
    
    // Déclenche la lecture vocale
    speak(aiMessage);

  } catch (error) {
    console.error("Erreur RAG :", error);
    removeThinking();
    appendRagMessage('Système', 'Erreur lors du traitement des documents. Vérifiez la console.');
  } finally {
    ragSendBtn.disabled = false;
  }
}

// Convertir une image en Base64
function readImageAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // Renvoie 'data:image/png;base64,...'
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Événement clic sur Envoyer
ragSendBtn.addEventListener('click', handleSend);

// Événement touche Entrée
ragUserInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSend();
});

// Bouton Stop
if (stopBtn) {
  stopBtn.addEventListener('click', stopSpeech);
}

// Reconnaissance vocale
if (micBtn) {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';

    micBtn.addEventListener('click', () => {
      stopSpeech();
      recognition.start();
      micBtn.textContent = '🎙️ Écoute...';
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      ragUserInput.value = transcript;
      micBtn.textContent = '🎤 Écouter';
      handleSend(); // Envoie automatiquement la question dictée
    };

    recognition.onerror = () => { micBtn.textContent = '🎤 Écouter'; };
    recognition.onend = () => { micBtn.textContent = '🎤 Écouter'; };
  } else {
    micBtn.disabled = true;
    micBtn.textContent = 'Micro non supporté';
  }
}