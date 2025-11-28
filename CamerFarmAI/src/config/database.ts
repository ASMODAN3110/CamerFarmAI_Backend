import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement depuis .env
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,  // true en dev pour créer automatiquement les tables
  logging: true,
  entities: ['src/models/**/*.entity.ts'],
  migrations: ['src/migrations/**/*.ts'],
});