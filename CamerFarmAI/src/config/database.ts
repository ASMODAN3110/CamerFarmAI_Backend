import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement depuis .env
dotenv.config();

// Determine if we're running compiled JavaScript (from dist/) or TypeScript (from src/ with ts-node)
// Check if __dirname contains 'dist' to detect compiled code
const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep) || __dirname.endsWith(path.sep + 'dist');

// In compiled mode (production app), __dirname will be dist/config
// In TypeScript mode (migrations with ts-node), __dirname will be src/config
const baseDir = path.join(__dirname, '..');
const entitiesPath = isCompiled 
  ? [path.join(baseDir, 'models', '**', '*.entity.js')]
  : [path.join(baseDir, 'models', '**', '*.entity.ts')];
const migrationsPath = isCompiled
  ? [path.join(baseDir, 'migrations', '**', '*.js')]
  : [path.join(baseDir, 'migrations', '**', '*.ts')];

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,  // true en dev pour créer automatiquement les tables
  logging: true,
  entities: entitiesPath,
  migrations: migrationsPath,
});
