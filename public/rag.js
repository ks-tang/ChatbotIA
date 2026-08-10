// Éléments DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const ragChatLog = document.getElementById('ragChatLog');
const ragUserInput = document.getElementById('ragUserInput');
const ragSendBtn = document.getElementById('ragSendBtn');

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
  
  // CORRECTION 1 : Utilisation de la bonne variable "ragChatLog"
  ragChatLog.appendChild(msgDiv);
  ragChatLog.scrollTop = ragChatLog.scrollHeight;
}

// Fonction pour lire un fichier texte brut dans le navigateur
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

// Fonction d'extraction du texte d'un PDF page par page
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

// Fonction globale pour extraire le texte selon l'extension
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

// Bouton Envoyer RAG 
ragSendBtn.addEventListener('click', async () => {
  const userPrompt = ragUserInput.value.trim();
  if (!userPrompt) return;

  if (uploadedFiles.length === 0) {
    alert("Veuillez d'abord ajouter au moins un document.");
    return;
  }

  appendRagMessage('Utilisateur', userPrompt);
  ragUserInput.value = '';
  
  // Indiquer que ça charge
  const originalBtnText = ragSendBtn.textContent;
  ragSendBtn.textContent = 'Recherche...';
  ragSendBtn.disabled = true;

  try {
    // Extraction du contenu de tous les fichiers déposés
    const extractedContext = await extractTextFromFiles(uploadedFiles);

    // Récupération dynamique du provider (Groq ou OpenRouter)
    const selectElement = document.getElementById('ragModelSelect');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const providerStr = selectedOption.getAttribute('data-provider');

    // Envoi vers le serveur /api/chat
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
    appendRagMessage('IA', data.choices[0].message.content);

  } catch (error) {
    console.error("Erreur RAG :", error);
    appendRagMessage('Système', 'Erreur lors du traitement des documents. Vérifiez la console.');
  } finally {
    // Restaurer le bouton
    ragSendBtn.textContent = originalBtnText;
    ragSendBtn.disabled = false;
  }
});