// src/index.ts
require('dotenv').config();

// Maintenant vous pouvez utiliser process.env
import express from 'express';

import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import 'reflect-metadata';  // Pour TypeORM
import authRouter from './routes/auth.routes';

// Importer la configuration de la base de données
import { AppDataSource } from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de sécurité et configuration
app.use(helmet());  // Sécurité headers
app.use(cors({ origin: 'http://localhost:5173' }));  // Pour ton frontend Vite
app.use(bodyParser.json());
app.use(cookieParser());  // Pour lire les cookies

// Importer et monter les routes 
app.use('/api/v1/auth', authRouter);




// Initialiser la connexion à la base de données
AppDataSource.initialize()
  .then(() => {
    console.log('DB connected');
    
    // Démarrer le serveur seulement après la connexion à la DB
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erreur lors de la connexion à la base de données:', error);
    process.exit(1); // Arrêter l'application si la DB ne peut pas se connecter
  });
