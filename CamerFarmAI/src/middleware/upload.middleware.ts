import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';

// Dossier de stockage des avatars (relatif à la racine du projet au runtime)
const AVATARS_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

// S'assurer que le dossier existe
try {
  if (!fs.existsSync(AVATARS_DIR)) {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  }
} catch (error) {
  console.warn(`Warning: Could not create uploads directory: ${AVATARS_DIR}`, error);
  // Continue anyway - multer will handle the error when trying to write
}

// Configuration du stockage sur disque
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, AVATARS_DIR);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, fileName: string) => void) => {
    const ext = path.extname(file.originalname) || '.png';

    // Utiliser l'ID utilisateur si disponible, sinon un identifiant générique
    const anyReq = req as any;
    const userId = anyReq.user?.id || 'anonymous';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    cb(null, `${userId}-${uniqueSuffix}${ext}`);
  },
});

// Filtre images : certains navigateurs envoient application/octet-stream ou un mimetype vide
const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp)$/;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (IMAGE_MIME.test(file.mimetype)) {
    cb(null, true);
    return;
  }
  const ext = path.extname(file.originalname || '');
  const looseMime =
    !file.mimetype ||
    file.mimetype === 'application/octet-stream' ||
    file.mimetype === '';
  if (looseMime && IMAGE_EXT.test(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error('Seules les images (PNG, JPG, JPEG, GIF, WEBP) sont autorisées'));
};

// Middleware multer configuré pour les avatars
export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Mo
  },
});
