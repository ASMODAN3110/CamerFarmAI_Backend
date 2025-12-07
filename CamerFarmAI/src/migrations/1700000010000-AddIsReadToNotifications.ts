import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsReadToNotifications1700000010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si les colonnes existent déjà
    const isReadExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'isRead'
    `);

    const dateLuExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'dateLu'
    `);

    // Ajouter la colonne isRead si elle n'existe pas
    if (isReadExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "notifications" 
        ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false
      `);
    }

    // Ajouter la colonne dateLu si elle n'existe pas
    if (dateLuExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "notifications" 
        ADD COLUMN "dateLu" TIMESTAMP
      `);
    }

    // Vérifier si l'index existe déjà
    const indexExists = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'notifications' AND indexname = 'IDX_notifications_isRead'
    `);

    // Créer un index pour améliorer les performances des requêtes sur isRead
    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_notifications_isRead" ON "notifications"("isRead")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer l'index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_isRead"`);

    // Supprimer les colonnes
    await queryRunner.query(`
      ALTER TABLE "notifications" 
      DROP COLUMN IF EXISTS "dateLu",
      DROP COLUMN IF EXISTS "isRead"
    `);
  }
}

