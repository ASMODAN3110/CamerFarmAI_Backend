// Importer Express
const express = require('express');
const app = express();

// Définir une route pour la page d'accueil
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Démarrer le serveur sur le port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
