import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModeToPlantationsAndModeChangedEvent1700000014000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ajouter le type enum pour le mode de plantation (seulement s'il n'existe pas)
    const enumTypeExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'plantation_mode_enum'
    `);

    if (enumTypeExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "plantation_mode_enum" AS ENUM ('automatic', 'manual')
      `);
    }

    // 2. Vérifier si la colonne mode existe déjà
    const modeColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'plantations' AND column_name = 'mode'
    `);

    // 3. Ajouter la colonne mode si elle n'existe pas
    if (modeColumnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "plantations" 
        ADD COLUMN "mode" "plantation_mode_enum" NOT NULL DEFAULT 'automatic'
      `);
    }

    // 4. Ajouter le nouveau type d'événement MODE_CHANGED à l'enum existant
    // Vérifier d'abord si le type event_type_enum existe
    const eventTypeEnumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'event_type_enum'
    `);

    if (eventTypeEnumExists.length > 0) {
      // Vérifier si la valeur existe déjà
      const enumValueExists = await queryRunner.query(`
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'mode_changed' 
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'event_type_enum'
        )
      `);

      // Ajouter la valeur seulement si elle n'existe pas
      if (enumValueExists.length === 0) {
        await queryRunner.query(`
          ALTER TYPE "event_type_enum" ADD VALUE 'mode_changed'
        `);
      }
    } else {
      // Si le type n'existe pas, c'est probablement que synchronize: true a été utilisé
      // et que le type sera créé automatiquement par TypeORM
      // On ne fait rien ici, le type sera créé avec toutes les valeurs lors de la synchronisation
      console.log('Le type event_type_enum n\'existe pas encore. Il sera créé automatiquement par TypeORM avec synchronize: true.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL ne permet pas de supprimer une valeur d'un enum directement
    // On ne peut que supprimer la colonne mode
    
    // Supprimer la colonne mode
    await queryRunner.query(`
      ALTER TABLE "plantations" 
      DROP COLUMN IF EXISTS "mode"
    `);

    // Supprimer le type enum (seulement si la colonne n'existe plus)
    await queryRunner.query(`
      DROP TYPE IF EXISTS "plantation_mode_enum"
    `);

    // Note: On ne peut pas supprimer 'mode_changed' de l'enum event_type_enum
    // car PostgreSQL ne le permet pas. Les événements existants avec ce type
    // devront être gérés manuellement si nécessaire.
  }
}

