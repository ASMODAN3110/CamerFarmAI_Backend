import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwoFactorAuthToUsers1700000016000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Vérifier si la colonne twoFactorSecret existe déjà
    const secretColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'twoFactorSecret'
    `);

    // 2. Ajouter la colonne twoFactorSecret si elle n'existe pas
    if (secretColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "twoFactorSecret" VARCHAR NULL
      `);
    }

    // 3. Vérifier si la colonne twoFactorEnabled existe déjà
    const enabledColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'twoFactorEnabled'
    `);

    // 4. Ajouter la colonne twoFactorEnabled si elle n'existe pas
    if (enabledColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les colonnes 2FA
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "twoFactorSecret"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "twoFactorEnabled"
    `);
  }
}

