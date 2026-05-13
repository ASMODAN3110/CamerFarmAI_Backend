import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEsp32AlertEventType1700000026000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter 'esp32_alert' à l'enum events_type_enum (si pas déjà présent)
    const enumValueExists = await queryRunner.query(`
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'esp32_alert'
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'events_type_enum'
        )
    `);

    if (enumValueExists.length === 0) {
      await queryRunner.query(`
        ALTER TYPE "events_type_enum" ADD VALUE 'esp32_alert'
      `);
      console.log('Valeur "esp32_alert" ajoutée à l\'enum events_type_enum');
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL ne permet pas de retirer une valeur d'un enum facilement.
    // On laisse cette migration down comme no-op.
  }
}

