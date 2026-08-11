# 🤖 CHATBOT.IA — Assistant IA Vocal, RAG & Agent Autonome

**CHATBOT.IA** est une application web moderne et élégante arborant un design inspiré de l'esthétique Nothing (typographies *VT323* / *Space Grotesk*, touches minimalistes et éléments visuels épurés). L'application combine interaction vocale, analyse de documents personnalisés (RAG) et automatisation d'actions via un agent autonome.

---

## 🌟 Fonctionnalités Principales

 L'application est divisée en trois modules principaux accessible via la barre de navigation :

### 1. 💬 IA Générale (`index.html`)
- **Assistant vocal & textuel :** Posez vos questions à l'oral (reconnaissance vocale via micro) ou à l'écrit, et écoutez les réponses grâce à la synthèse vocale intégrée.
- **Sélection dynamique de modèles :**
  - **Groq :** Llama 3.3 70B Versatile *(Ultra Rapide)*
  - **OpenRouter :** GPT OSS 20B *(Gratuit)*
  - **OpenRouter :** Google Gemma 4 26B A4B *(Gratuit)*
  - **OpenRouter :** Nvidia Nemotron 3 Ultra 550B A55B *(Gratuit)*

---

### 2. 📄 Assistant IA RAG (`rag.html`)
- **Interrogation de documents (RAG) :** Analysez et posez des questions directement sur vos données et fichiers personnels.
- **Glisser-déposer (Drag & Drop) :** Zone de dépôt intuitive pour vos fichiers avec compteur et liste d'indexation en temps réel.
- **Formats supportés :**
  - Documents textuels : `PDF`, `TXT`, `MD`, `CSV`
  - Images (via Google Gemma 4) : `JPG`, `JPEG`, `PNG`, `WEBP`
- **Analyse multi-format :** Intégration de `pdf.js` pour la lecture native des fichiers PDF côté client.

---

### 3. ⚙️ Agent IA & Automations (`agent.html`)
- **Agent autonome :** Exécutez des ordres et des tâches automatisées.
- **Gestion sécurisée des clés API (Local Storage) :**
  - **Gmail :** Support direct via adresse e-mail et mot de passe d'application.
  - **Resend :** Envoi d'e-mails via l'API Resend.
  - **Google Calendar / iCal :** Synchronisation et gestion de calendrier.
- **Sécurité & Confidentialité :** Vos identifiants et clés d'API sont stockés exclusivement dans le navigateur (`localStorage`) et ne sont transmis qu'aux services requis lors de l'exécution d'ordres.

---

