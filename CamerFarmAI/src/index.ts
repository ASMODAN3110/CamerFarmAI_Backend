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
import plantationRouter from './routes/plantation.routes';
import eventRouter from './routes/event.routes';
import notificationRouter from './routes/notification.routes';
import technicianRouter from './routes/technician.routes';
import adminRouter from './routes/admin.routes';

// Importer la configuration de la base de données
import { AppDataSource } from './config/database';

// Middlewares de sécurité
import { securityHeaders, logSecurityEvents, validateOrigin, requestSizeLimiter } from './middleware/security.middleware';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de sécurité et configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));  // Sécurité headers avec support CORS

// Headers de sécurité supplémentaires
app.use(securityHeaders);

// Validation de l'origine
app.use(validateOrigin);

// Limite de taille des requêtes (10MB par défaut)
app.use(requestSizeLimiter('10mb'));

// Logging des événements de sécurité
app.use(logSecurityEvents);

// Configuration CORS pour permettre les cookies depuis le frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173' || 'https://camerfarmaif.vercel.app',
  credentials: true,  // Nécessaire pour envoyer/recevoir les cookies HttpOnly
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());  // Pour lire les cookies

// Servir les fichiers uploadés (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Importer et monter les routes 
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/plantations', plantationRouter);
app.use('/api/v1/events', eventRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/technician', technicianRouter);
app.use('/api/v1/admin', adminRouter);




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
