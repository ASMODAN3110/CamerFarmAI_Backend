import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSensorToNewPlantation1700000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver la plantation "Nouveau Champ de Test"
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE name = $1`,
      ['Nouveau Champ de Test']
    );

    if (plantationResult.length === 0) {
      throw new Error('Plantation "Nouveau Champ de Test" non trouvée. Exécutez d\'abord la migration 1700000006000-AddNewPlantationWithSensors.ts');
    }

    const plantationId = plantationResult[0].id;

    // 2. Vérifier les capteurs existants pour éviter les doublons
    const existingSensors = await queryRunner.query(
      `SELECT type FROM sensors WHERE "plantationId" = $1`,
      [plantationId]
    );

    const existingTypes = existingSensors.map((s: { type: string }) => s.type);

    // 3. Déterminer quel type de capteur ajouter
    // Les types disponibles : temperature, soilMoisture, co2Level, waterLevel, luminosity
    // On ajoute le premier type qui n'existe pas encore
    let sensorTypeToAdd: string;
    if (!existingTypes.includes('co2Level')) {
      sensorTypeToAdd = 'co2Level';
    } else if (!existingTypes.includes('waterLevel')) {
      sensorTypeToAdd = 'waterLevel';
    } else if (!existingTypes.includes('luminosity')) {
      sensorTypeToAdd = 'luminosity';
    } else {
      // Si tous les types existent déjà, on ajoute quand même un capteur de type co2Level
      // (on pourrait avoir plusieurs capteurs du même type)
      sensorTypeToAdd = 'co2Level';
    }

    // 4. Ajouter le nouveau capteur
    await queryRunner.query(
      `INSERT INTO sensors (id, type, status, "plantationId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
      [
        sensorTypeToAdd,
        'active',
        plantationId,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer le capteur ajouté
    
    // 1. Trouver la plantation
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE name = $1`,
      ['Nouveau Champ de Test']
    );

    if (plantationResult.length > 0) {
      const plantationId = plantationResult[0].id;

      // 2. Trouver les capteurs de cette plantation créés après la migration 1700000006000
      // On supprime le dernier capteur ajouté (celui avec le timestamp le plus récent)
      // ou on peut supprimer un capteur spécifique par type
      
      // Option 1: Supprimer le dernier capteur ajouté (le plus récent)
      await queryRunner.query(
        `DELETE FROM sensors 
         WHERE "plantationId" = $1 
         AND id = (
           SELECT id FROM sensors 
           WHERE "plantationId" = $1 
           ORDER BY "createdAt" DESC 
           LIMIT 1
         )`,
        [plantationId]
      );

      // Note: Si vous voulez supprimer un type spécifique, utilisez plutôt:
      // await queryRunner.query(
      //   `DELETE FROM sensors WHERE "plantationId" = $1 AND type = $2`,
      //   [plantationId, 'co2Level']
      // );
    }
  }
}

