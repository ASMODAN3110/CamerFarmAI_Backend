import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThresholdChangedEvent1700000022000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ajouter le nouveau type d'événement THRESHOLD_CHANGED à l'enum existant
    // Vérifier d'abord si le type event_type_enum existe
    const eventTypeEnumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'event_type_enum'
    `);

    if (eventTypeEnumExists.length > 0) {
      // Vérifier si la valeur existe déjà
      const enumValueExists = await queryRunner.query(`
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'threshold_changed' 
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'event_type_enum'
        )
      `);

      // Ajouter la valeur seulement si elle n'existe pas
      if (enumValueExists.length === 0) {
        await queryRunner.query(`
          ALTER TYPE "event_type_enum" ADD VALUE 'threshold_changed'
        `);
      }
    } else {
      // Si le type n'existe pas, c'est probablement que synchronize: true a été utilisé
      // et que le type sera créé automatiquement par TypeORM
      console.log('Le type event_type_enum n\'existe pas encore. Il sera créé automatiquement par TypeORM avec synchronize: true.');
    }

    console.log('✓ Type d\'événement threshold_changed ajouté à l\'enum event_type_enum');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL ne permet pas de supprimer une valeur d'un enum directement
    // Les événements existants avec ce type devront être gérés manuellement si nécessaire
    console.log('Note: PostgreSQL ne permet pas de supprimer une valeur d\'enum. Les événements threshold_changed existants seront conservés.');
  }
}

