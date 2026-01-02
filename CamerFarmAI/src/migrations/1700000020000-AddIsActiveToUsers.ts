import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToUsers1700000020000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter la colonne isActive avec valeur par défaut true
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "isActive" boolean NOT NULL DEFAULT true
    `);

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

