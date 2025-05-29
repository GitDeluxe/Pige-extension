# Webhook Sender Extension

Une extension de navigateur simple qui permet d'envoyer des requêtes POST à un webhook.

## Fonctionnalités

- Champ pour entrer l'URL du webhook
- Zone de texte pour saisir le message à envoyer
- Envoi de requêtes POST au webhook spécifié
- Sauvegarde de l'URL du webhook pour une utilisation future
- Affichage des messages de succès ou d'erreur

## Installation

1. Ouvrez Chrome et accédez à `chrome://extensions/`
2. Activez le "Mode développeur" en haut à droite
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier contenant cette extension

## Utilisation

1. Cliquez sur l'icône de l'extension dans la barre d'outils du navigateur
2. Entrez l'URL du webhook dans le champ prévu
3. Saisissez votre message dans la zone de texte
4. Cliquez sur "Envoyer" pour envoyer la requête POST

## Format de la requête

La requête POST envoyée au webhook aura le format JSON suivant:

```json
{
  "message": "Votre message ici"
}
```

## Compatibilité

Cette extension est compatible avec les navigateurs basés sur Chromium (Chrome, Edge, Brave, etc.).
