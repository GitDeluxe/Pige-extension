// Service Worker pour intercepter les tokens Bearer
let capturedTokens = new Map();

// Intercepter les requêtes sortantes pour capturer les tokens Bearer
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    // Logging pour debug - afficher toutes les requêtes vers yanport.com
    if (details.url.includes('yanport.com/users')) {
      console.log(' Requête Yanport détectée:', details.url);
      console.log(' Headers:', details.requestHeaders);
    }
    
    if (details.requestHeaders) {
      for (let header of details.requestHeaders) {
        if (header.name.toLowerCase() === 'authorization' && 
            header.value.toLowerCase().startsWith('bearer ')) {
          
          const token = header.value.substring(7); // Enlever "Bearer "
          const domain = new URL(details.url).hostname;
          const apiPath = new URL(details.url).pathname;
          
          // Logging spécial pour Yanport
          if (domain.includes('yanport.com')) {
            console.log(' TOKEN BEARER YANPORT CAPTURÉ!');
            console.log(' URL complète:', details.url);
            console.log(' Token (tronqué):', token.substring(0, 20) + '...' + token.substring(token.length - 10));
            console.log(' Domaine:', domain);
            console.log(' Chemin API:', apiPath);
          }
          
          // Stocker le token avec plus d'informations
          const tokenData = {
            token: token,
            timestamp: Date.now(),
            url: details.url,
            domain: domain,
            apiPath: apiPath,
            method: details.method
          };
          
          // Stocker le token avec le domaine et timestamp
          capturedTokens.set(domain, tokenData);
          
          // Sauvegarder dans le storage pour accès depuis popup
          chrome.storage.local.set({
            [`bearer_token_${domain}`]: tokenData
          });
          
          console.log(` Token Bearer capturé pour ${domain}:`, token.substring(0, 20) + '...');
        }
      }
    }
  },
  {urls: ["<all_urls>"]},
  ["requestHeaders"]
);

// API pour récupérer les tokens depuis le popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTokens') {
    // Retourner tous les tokens capturés
    const tokensArray = Array.from(capturedTokens.entries()).map(([domain, data]) => ({
      domain,
      ...data
    }));
    sendResponse({tokens: tokensArray});
  }
  
  if (request.action === 'getTokenForCurrentTab') {
    // Obtenir le token pour l'onglet actuel
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        const domain = new URL(tabs[0].url).hostname;
        const tokenData = capturedTokens.get(domain);
        sendResponse({token: tokenData});
      } else {
        sendResponse({token: null});
      }
    });
    return true; // Indique une réponse asynchrone
  }
  
  if (request.action === 'clearTokens') {
    capturedTokens.clear();
    chrome.storage.local.clear();
    sendResponse({success: true});
  }
});

// Nettoyer les anciens tokens (plus de 1 heure)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (let [domain, data] of capturedTokens.entries()) {
    if (data.timestamp < oneHourAgo) {
      capturedTokens.delete(domain);
      chrome.storage.local.remove(`bearer_token_${domain}`);
    }
  }
}, 5 * 60 * 1000); // Vérifier toutes les 5 minutes
