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
      const errorMsg = data.error || 'L\'IA sélectionnée est indisponible.';
      appendMessage('Système', errorMsg);
    }
  } catch (error) {
    console.error('❌ Erreur Fetch côté client:', error);
    appendMessage('Système', 'Erreur lors de la communication avec l\'IA.');
  }
}