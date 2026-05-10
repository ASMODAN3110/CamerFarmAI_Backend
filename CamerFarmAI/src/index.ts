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

import { body } from 'express-validator';
import { sanitizeInput } from './middleware/sanitize.middleware';
import { googleLogin, googleRegister } from './controllers/auth.controllers';
import { migrateAvatarsOnStartup } from './utils/migrateAvatars';
import { updateAllPlantationsSensorStatuses } from './services/sensor-status.service';

// Importer la configuration de la base de données
import { AppDataSource } from './config/database';

// Middlewares de sécurité
import { securityHeaders, logSecurityEvents, requestSizeLimiter } from './middleware/security.middleware';

const app = express();
const PORT = process.env.PORT || 3000;

// Derrière un reverse proxy (Traefik, etc.) pour que req.protocol / host reflètent HTTPS
app.set(
  'trust proxy',
  process.env.TRUST_PROXY === 'false' ? false : Number(process.env.TRUST_PROXY_COUNT) || 1
);

// Middlewares de sécurité et configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Permet aux popups (ex: connexion Google) de communiquer avec la fenêtre d'origine via postMessage.
  // Sans ça, certains navigateurs bloquent window.postMessage quand COOP empêche l'opener cross-origin.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
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
// Validation de l'origine (Désactivé temporairement car il bloque Vercel)
// app.use(validateOrigin);

// Limite de taille des requêtes (10MB par défaut)
app.use(requestSizeLimiter('10mb'));

// Logging des événements de sécurité
app.use(logSecurityEvents);

// Configuration CORS pour permettre les cookies depuis le frontend
// Configuration CORS temporaire pour debug
app.use(cors({
  origin: true, // Autorise tout le monde pour tester
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
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
app.use('/auth', authRouter); // Fallback pour le frontend qui oublie /api/v1

// Aliases explicites pour Google OAuth.
// Objectif: éviter un 404 côté prod si la version déployée / le reverse-proxy n'expose pas correctement les routes routerées.
app.post(
  '/api/v1/auth/google/login',
  [
    body('idToken')
      .notEmpty()
      .withMessage('Le token Google est requis')
      .isString()
      .withMessage('Le token Google doit être une chaîne de caractères'),
  ],
  sanitizeInput,
  googleLogin
);

app.post(
  '/api/v1/auth/google/register',
  [
    body('idToken')
      .notEmpty()
      .withMessage('Le token Google est requis')
      .isString()
      .withMessage('Le token Google doit être une chaîne de caractères'),
  ],
  sanitizeInput,
  googleRegister
);

app.post(
  '/auth/google/login',
  [
    body('idToken')
      .notEmpty()
      .withMessage('Le token Google est requis')
      .isString()
      .withMessage('Le token Google doit être une chaîne de caractères'),
  ],
  sanitizeInput,
  googleLogin
);

app.post(
  '/auth/google/register',
  [
    body('idToken')
      .notEmpty()
      .withMessage('Le token Google est requis')
      .isString()
      .withMessage('Le token Google doit être une chaîne de caractères'),
  ],
  sanitizeInput,
  googleRegister
);

app.use('/api/v1/plantations', plantationRouter);
app.use('/plantations', plantationRouter);

app.use('/api/v1/events', eventRouter);
app.use('/events', eventRouter);

app.use('/api/v1/notifications', notificationRouter);
app.use('/notifications', notificationRouter);

app.use('/api/v1/technician', technicianRouter);
app.use('/technician', technicianRouter);

app.use('/api/v1/admin', adminRouter);
app.use('/admin', adminRouter);

// Si aucune route ne matche: renvoyer du JSON (pas une page HTML Express).
// Ça évite le bug côté frontend du type "Cannot create property 'status' on string '<!DOCTYPE html>...'"
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not Found',
    path: req.originalUrl,
  });
});

// Handler d'erreur JSON standard (pour éviter les retours HTML incomplets)
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const statusCode = err?.statusCode || err?.status || 500;
    res.status(statusCode).json({
      success: false,
      message: err?.message || 'Internal Server Error',
    });
  }
);

// Initialiser la connexion à la base de données
AppDataSource.initialize()
  .then(async () => {
    console.log('DB connected');

    // Migration best-effort (ne bloque jamais le démarrage).
    if (process.env.NODE_ENV === 'production') {
      try {
        await migrateAvatarsOnStartup();
      } catch (err) {
        console.error('[Avatar migration] Migration failed:', err);
      }
    }

    // Démarrer le serveur seulement après la connexion à la DB
    // Sync périodique des statuts capteurs (active/inactive)
    // Objectif: ne pas attendre qu'un utilisateur se connecte pour refléter les changements.
    const refreshMs = Number(process.env.SENSOR_STATUS_REFRESH_MS) || 5 * 60 * 1000; // défaut: toutes les 5 minutes
    // Best-effort initial
    updateAllPlantationsSensorStatuses().catch((err) => {
      console.error('[Sensor status sync] Initial sync failed:', err);
    });
    setInterval(() => {
      updateAllPlantationsSensorStatuses().catch((err) => {
        console.error('[Sensor status sync] Interval sync failed:', err);
      });
    }, refreshMs);

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erreur lors de la connexion à la base de données:', error);
    process.exit(1); // Arrêter l'application si la DB ne peut pas se connecter
  });
