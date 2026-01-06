import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToUsers1700000020000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la colonne isActive existe déjà
    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'isActive'
    `);

    // Ajouter la colonne isActive avec valeur par défaut true seulement si elle n'existe pas
    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "isActive" boolean NOT NULL DEFAULT true
      `);
    }

    // Mettre à jour tous les utilisateurs existants pour qu'ils soient actifs
    await queryRunner.query(`
      UPDATE "users"
      SET "isActive" = true
      WHERE "isActive" IS NULL
    `);

    console.log('✓ Colonne isActive ajoutée à la table users');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la colonne isActive
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "isActive"
    `);

    console.log('✓ Colonne isActive supprimée de la table users');
  }
}

