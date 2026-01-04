import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarUrlToUsers1700000021000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vérifier si la colonne avatarUrl existe déjà
    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatarUrl'
    `);

    // Ajouter la colonne avatarUrl avec valeur nullable seulement si elle n'existe pas
    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "avatarUrl" varchar NULL
      `);
    }

    console.log('✓ Colonne avatarUrl ajoutée à la table users');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la colonne avatarUrl
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "avatarUrl"
    `);

    console.log('✓ Colonne avatarUrl supprimée de la table users');
  }
}

