import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleAuthToUsers1700000023000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ajouter 'google' à l'enum users_authprovider_enum
    const enumValueExists = await queryRunner.query(`
      SELECT 1 
      FROM pg_enum 
      WHERE enumlabel = 'google' 
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'users_authprovider_enum'
      )
    `);

    if (enumValueExists.length === 0) {
      await queryRunner.query(`
        ALTER TYPE "users_authprovider_enum" ADD VALUE 'google'
      `);
      console.log('✓ Valeur "google" ajoutée à l\'enum users_authprovider_enum');
    }

    // 2. Rendre la colonne phone nullable (si ce n'est pas déjà le cas)
    const phoneColumnInfo = await queryRunner.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `);

    if (phoneColumnInfo.length > 0 && phoneColumnInfo[0].is_nullable === 'NO') {
      // Supprimer la contrainte unique temporairement si elle existe
      const uniqueConstraint = await queryRunner.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%phone%'
      `);

      if (uniqueConstraint.length > 0) {
        await queryRunner.query(`
          ALTER TABLE "users" DROP CONSTRAINT "${uniqueConstraint[0].constraint_name}"
        `);
      }

      // Rendre la colonne nullable
      await queryRunner.query(`
        ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL
      `);

      // Recréer la contrainte unique (nullable permet plusieurs NULL)
      if (uniqueConstraint.length > 0) {
        await queryRunner.query(`
          ALTER TABLE "users" ADD CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
        `);
      }

      console.log('✓ Colonne phone rendue nullable');
    }

    // 3. Ajouter la colonne googleId (nullable, unique)
    const googleIdColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'googleId'
    `);

    if (googleIdColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "googleId" varchar NULL
      `);

      // Ajouter la contrainte unique sur googleId
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_users_googleId" ON "users" ("googleId") 
        WHERE "googleId" IS NOT NULL
      `);

      console.log('✓ Colonne googleId ajoutée à la table users');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la colonne googleId
    const googleIdColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'googleId'
    `);

    if (googleIdColumnExists.length > 0) {
      // Supprimer l'index unique
      await queryRunner.query(`
        DROP INDEX IF EXISTS "UQ_users_googleId"
      `);

      await queryRunner.query(`
        ALTER TABLE "users" DROP COLUMN "googleId"
      `);

      console.log('✓ Colonne googleId supprimée de la table users');
    }

    // Remettre phone en NOT NULL (seulement si tous les utilisateurs ont un phone)
    // Note: Cette opération peut échouer si des utilisateurs ont phone = NULL
    // Il faudra gérer cela manuellement si nécessaire
    try {
      const nullPhones = await queryRunner.query(`
        SELECT COUNT(*) as count FROM "users" WHERE "phone" IS NULL
      `);

      if (parseInt(nullPhones[0].count) === 0) {
        await queryRunner.query(`
          ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL
        `);
        console.log('✓ Colonne phone remise en NOT NULL');
      } else {
        console.log('⚠ Impossible de remettre phone en NOT NULL : des utilisateurs ont phone = NULL');
      }
    } catch (error) {
      console.log('⚠ Erreur lors de la remise de phone en NOT NULL:', error);
    }

    // Note: PostgreSQL ne permet pas de supprimer une valeur d'un enum directement
    // La valeur 'google' restera dans l'enum mais ne sera plus utilisée
    console.log('Note: La valeur "google" reste dans l\'enum users_authprovider_enum (limitation PostgreSQL)');
  }
}
