// src/index.ts
require('dotenv').config();

// Maintenant vous pouvez utiliser process.env
import express from 'express';

import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import 'reflect-metadata';  // Pour TypeORM
import authRouter from './routes/auth.routes';
import plantationRouter from './routes/plantation.routes';  // Ajouter cette ligne

// Importer la configuration de la base de données
import { AppDataSource } from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de sécurité et configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));  // Sécurité headers avec support CORS

// Configuration CORS pour permettre les cookies depuis le frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,  // Nécessaire pour envoyer/recevoir les cookies HttpOnly
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());
app.use(cookieParser());  // Pour lire les cookies

// Servir les fichiers uploadés (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Importer et monter les routes 
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/plantations', plantationRouter);  // Ajouter cette ligne




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
