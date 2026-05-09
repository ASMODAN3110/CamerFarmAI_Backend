import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';

const AVATARS_ROOT_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

function moveFileBestEffort(fromPath: string, toPath: string): void {
  // Même filesystem en général, mais on garde un fallback "copy+unlink" si rename échoue.
  try {
    fs.renameSync(fromPath, toPath);
    return;
  } catch (err) {
    // Fallback: copy + delete
  }

  fs.copyFileSync(fromPath, toPath);
  fs.unlinkSync(fromPath);
}

export async function migrateAvatarsOnStartup(): Promise<void> {
  const repo = AppDataSource.getRepository(User);

  // Best effort: on ne bloque jamais le démarrage si la migration échoue.
  let users: Array<Pick<User, 'id' | 'avatarUrl'>> = [];
  try {
    users = await repo.find({
      select: ['id', 'avatarUrl'],
    });
  } catch {
    // noop
  }

  if (!users.length) return;

  fs.mkdirSync(AVATARS_ROOT_DIR, { recursive: true });

  for (const u of users) {
    const avatarUrl = u.avatarUrl;
    if (!avatarUrl) continue;

    const rel = String(avatarUrl).split('/uploads/avatars/')[1];
    if (!rel) continue;

    const relNoQuery = rel.split('?')[0];

    // Déjà au bon format: uploads/avatars/<userId>/<filename>
    if (relNoQuery.includes('/')) continue;

    const filename = relNoQuery;
    if (!filename) continue;

    const fromPath = path.join(AVATARS_ROOT_DIR, filename);
    const toDir = path.join(AVATARS_ROOT_DIR, u.id);
    const toPath = path.join(toDir, filename);

    try {
      if (!fs.existsSync(fromPath)) continue;
      fs.mkdirSync(toDir, { recursive: true });

      moveFileBestEffort(fromPath, toPath);

      // Mettre à jour l'URL en gardant potentiellement scheme+host si c'est une URL absolue.
      const newAvatarUrl = String(avatarUrl).replace(
        '/uploads/avatars/',
        `/uploads/avatars/${u.id}/`
      );

      // Best effort: update ligne DB, mais ne pas bloquer si save échoue.
      await repo.update(u.id, { avatarUrl: newAvatarUrl } as any);
    } catch (err) {
      console.error('[Avatar migration] Error migrating user', {
        userId: u.id,
        filename,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

