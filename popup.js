document.addEventListener('DOMContentLoaded', function() {
  // Load saved webhook URL if available
  chrome.storage.local.get(['webhookUrl'], function(result) {
    if (result.webhookUrl) {
      document.getElementById('webhook-url').value = result.webhookUrl;
    }
  });

  // Add event listeners
  document.getElementById('send-button').addEventListener('click', sendWebhook);
  document.getElementById('refresh-token').addEventListener('click', refreshToken);
  document.getElementById('clear-tokens').addEventListener('click', clearTokens);
  document.getElementById('show-all-tokens').addEventListener('click', showAllTokens);
  
  // Charger automatiquement le token au démarrage
  refreshToken();
});

// Fonction pour récupérer le token de l'onglet actuel
function refreshToken() {
  const tokenInput = document.getElementById('bearer-token');
  const tokenInfo = document.getElementById('token-info');
  
  // Demander le token pour l'onglet actuel
  chrome.runtime.sendMessage({action: 'getTokenForCurrentTab'}, (response) => {
    if (response && response.token) {
      console.log('🔍 Réponse du service worker:', response);
      const token = response.token.token;
      const domain = response.token.domain || new URL(response.token.url).hostname;
      const timestamp = new Date(response.token.timestamp).toLocaleString();
      const apiPath = response.token.apiPath || 'N/A';
      const method = response.token.method || 'N/A';
      
      // Afficher le token (tronqué pour la sécurité)
      tokenInput.value = token.substring(0, 20) + '...' + token.substring(token.length - 10);
      
      // Stocker le token complet pour utilisation
      tokenInput.dataset.fullToken = token;
      
      // Afficher les informations détaillées
      let infoText = `Token capturé de ${domain} à ${timestamp}`;
      if (domain.includes('yanport.com')) {
        infoText += `\n🎯 API Yanport détectée - Chemin: ${apiPath} (${method})`;
      }
      
      tokenInfo.textContent = infoText;
      tokenInfo.className = 'token-info show success';
      
      showStatus(`Token Bearer détecté pour ${domain}`, 'success');
    } else {
      console.log('❌ Aucun token trouvé pour cet onglet');
      tokenInput.value = '';
      tokenInput.dataset.fullToken = '';
      tokenInfo.textContent = 'Aucun token Bearer détecté pour ce site. Naviguez sur un site qui utilise l\'authentification Bearer (ex: api.yanport.com).';
      tokenInfo.className = 'token-info show warning';
    }
  });
}

// Fonction pour vider tous les tokens
function clearTokens() {
  chrome.runtime.sendMessage({action: 'clearTokens'}, (response) => {
    if (response.success) {
      document.getElementById('bearer-token').value = '';
      document.getElementById('bearer-token').dataset.fullToken = '';
      document.getElementById('token-info').className = 'token-info';
      showStatus('Tous les tokens ont été supprimés', 'success');
    }
  });
}

// Fonction pour afficher tous les tokens capturés
function showAllTokens() {
  const allTokensList = document.getElementById('all-tokens-list');
  
  chrome.runtime.sendMessage({action: 'getTokens'}, (response) => {
    console.log(response);
    if (response && response.tokens && response.tokens.length > 0) {
      allTokensList.innerHTML = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">📋 Tous les tokens capturés:</h4>';
      
      response.tokens.forEach((tokenData) => {
        const tokenItem = document.createElement('div');
        const isYanport = tokenData.domain.includes('yanport.com');
        tokenItem.className = `token-item ${isYanport ? 'yanport' : ''}`;
        
        const tokenPreview = tokenData.token.substring(0, 15) + '...' + tokenData.token.substring(tokenData.token.length - 8);
        
        tokenItem.innerHTML = `
          <div class="domain">${isYanport ? '🎯 ' : ''}${tokenData.domain}</div>
          <div class="details">
            ${tokenData.apiPath ? `API: ${tokenData.apiPath} (${tokenData.method})` : 'URL: ' + tokenData.url}<br>
            Capturé: ${new Date(tokenData.timestamp).toLocaleString()}
          </div>
          <div class="token-preview">Token: ${tokenPreview}</div>
        `;
        
        // Ajouter un click listener pour sélectionner ce token
        tokenItem.addEventListener('click', () => {
          document.getElementById('bearer-token').value = tokenPreview;
          document.getElementById('bearer-token').dataset.fullToken = tokenData.token;
          document.getElementById('token-info').textContent = `Token sélectionné de ${tokenData.domain}`;
          document.getElementById('token-info').className = 'token-info show success';
          showStatus(`Token de ${tokenData.domain} sélectionné`, 'success');
        });
        
        allTokensList.appendChild(tokenItem);
      });
      
      allTokensList.className = 'all-tokens-list show';
      showStatus(`${response.tokens.length} token(s) trouvé(s)`, 'success');
    } else {
      allTokensList.innerHTML = '<p style="margin: 0; color: #666;">Aucun token Bearer capturé pour le moment.</p>';
      allTokensList.className = 'all-tokens-list show';
      showStatus('Aucun token capturé', 'warning');
    }
  });
}

// Function to send the webhook
function sendWebhook() {
  const webhookUrl = document.getElementById('webhook-url').value.trim();
  const selectedName = document.getElementById('name-select').value;
  const bearerToken = document.getElementById('bearer-token').dataset.fullToken;
  const statusMessage = document.getElementById('status-message');
  
  // Validate inputs
  if (!webhookUrl) {
    showStatus('Veuillez entrer une URL de webhook', 'error');
    return;
  }
  
  if (!selectedName) {
    showStatus('Veuillez sélectionner un nom', 'error');
    return;
  }
  
  // Save webhook URL for future use
  chrome.storage.local.set({ webhookUrl: webhookUrl });
  
  // Prepare data to send (inclure le token si disponible)
  const data = {
    sender: selectedName,
    timestamp: new Date().toISOString(),
    bearerToken: bearerToken || null // Inclure le token si disponible
  };
  
  // Préparer les headers (inclure le token Bearer si disponible)
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }
  
  // Send POST request
  fetch(webhookUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Erreur de réponse: ${response.status}`);
    }
    return response.text();
  })
  .then(data => {
    showStatus('Message envoyé avec succès!', 'success');
  })
  .catch(error => {
    console.error('Erreur:', error);
    showStatus(`Erreur lors de l'envoi: ${error.message}`, 'error');
  });
}

// Function to show status messages
function showStatus(message, type) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`;
  
  // Hide the message after 5 seconds
  setTimeout(() => {
    statusElement.textContent = '';
    statusElement.className = 'status-message';
  }, 5000);
}
