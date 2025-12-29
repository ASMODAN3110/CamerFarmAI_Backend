import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fonction helper pour générer une valeur réaliste selon le type de capteur
 */
function generateSensorValue(sensorType: string): number {
  let value: number;
  
  switch (sensorType) {
    case 'temperature':
      // Température entre 20°C et 32°C
      value = 25 + (Math.random() - 0.5) * 10;
      value = Math.max(20, Math.min(32, value));
      break;
    case 'soilMoisture':
      // Humidité du sol entre 50% et 85%
      value = 65 + (Math.random() - 0.5) * 20;
      value = Math.max(50, Math.min(85, value));
      break;
    case 'co2Level':
      // Niveau de CO2 entre 400 ppm et 850 ppm
      value = 500 + (Math.random() - 0.5) * 300;
      value = Math.max(400, Math.min(850, value));
      break;
    case 'waterLevel':
      // Niveau d'eau entre 55% et 95%
      value = 75 + (Math.random() - 0.5) * 25;
      value = Math.max(55, Math.min(95, value));
      break;
    case 'luminosity':
      // Luminosité entre 200 lux et 800 lux (jour)
      value = 500 + (Math.random() - 0.5) * 400;
      value = Math.max(200, Math.min(800, value));
      break;
    default:
      // Valeur par défaut
      value = 50 + (Math.random() - 0.5) * 20;
  }

  // Arrondir à 2 décimales
  return Math.round(value * 100) / 100;
}

export class ActivateInactiveSensors1700000019000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver la plantation "Nouveau Champ de Test"
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE name = $1`,
      ['Nouveau Champ de Test']
    );

    if (plantationResult.length === 0) {
      console.log('⚠ Plantation "Nouveau Champ de Test" non trouvée');
      return;
    }

    const plantationId = plantationResult[0].id;
    console.log(`✓ Plantation trouvée: "Nouveau Champ de Test" (${plantationId})`);

    // 2. Trouver tous les capteurs INACTIVE de cette plantation
    const inactiveSensors = await queryRunner.query(
      `SELECT id, type FROM sensors WHERE "plantationId" = $1 AND status = $2`,
      [plantationId, 'inactive']
    );

    if (inactiveSensors.length === 0) {
      console.log('✓ Aucun capteur inactif trouvé pour cette plantation');
      return;
    }

    console.log(`✓ ${inactiveSensors.length} capteur(s) inactif(s) trouvé(s)`);

    // 3. Pour chaque capteur inactif, ajouter une lecture récente et activer
    const now = new Date();
    let activatedCount = 0;
    
    for (const sensor of inactiveSensors) {
      // Vérifier si une lecture récente existe déjà (moins d'1 heure)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentReading = await queryRunner.query(
        `SELECT id FROM sensor_readings 
         WHERE "sensorId" = $1 AND timestamp > $2 
         ORDER BY timestamp DESC LIMIT 1`,
        [sensor.id, oneHourAgo.toISOString()]
      );

      // Si une lecture récente existe déjà, on met juste à jour le statut
      if (recentReading.length > 0) {
        await queryRunner.query(
          `UPDATE sensors SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
          ['active', sensor.id]
        );
        console.log(`✓ Capteur ${sensor.type} activé (lecture récente existante)`);
        activatedCount++;
        continue;
      }

      // Générer une valeur réaliste selon le type
      const value = generateSensorValue(sensor.type);
      
      // Créer une lecture récente (il y a 5 minutes pour garantir qu'elle soit < 1 heure)
      const recentTimestamp = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Insérer la lecture
      await queryRunner.query(
        `INSERT INTO sensor_readings (id, value, "sensorId", timestamp)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [value, sensor.id, recentTimestamp.toISOString()]
      );

      // Mettre à jour le statut du capteur à ACTIVE
      await queryRunner.query(
        `UPDATE sensors SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
        ['active', sensor.id]
      );

      console.log(`✓ Capteur ${sensor.type} activé avec une nouvelle lecture (valeur: ${value})`);
      activatedCount++;
    }

    console.log(`✓ Migration terminée : ${activatedCount} capteur(s) activé(s)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les lectures créées par cette migration et remettre les capteurs en INACTIVE
    
    // 1. Trouver la plantation
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE name = $1`,
      ['Nouveau Champ de Test']
    );

    if (plantationResult.length === 0) {
      console.log('⚠ Plantation "Nouveau Champ de Test" non trouvée. Aucune suppression effectuée.');
      return;
    }

    const plantationId = plantationResult[0].id;

    // 2. Trouver tous les capteurs de cette plantation
    const sensors = await queryRunner.query(
      `SELECT id FROM sensors WHERE "plantationId" = $1`,
      [plantationId]
    );

    if (sensors.length === 0) {
      console.log('⚠ Aucun capteur trouvé pour cette plantation.');
      return;
    }

    // 3. Pour chaque capteur, supprimer les lectures récentes (moins d'1 heure)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    let deletedCount = 0;

    for (const sensor of sensors) {
      const result = await queryRunner.query(
        `DELETE FROM sensor_readings 
         WHERE "sensorId" = $1 AND timestamp > $2`,
        [sensor.id, oneHourAgo.toISOString()]
      );
      
      // Vérifier s'il reste des lectures récentes
      const remainingReadings = await queryRunner.query(
        `SELECT COUNT(*) as count FROM sensor_readings 
         WHERE "sensorId" = $1 AND timestamp > $2`,
        [sensor.id, oneHourAgo.toISOString()]
      );

      // Si aucune lecture récente ne reste, mettre le capteur en INACTIVE
      if (parseInt(remainingReadings[0].count) === 0) {
        await queryRunner.query(
          `UPDATE sensors SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
          ['inactive', sensor.id]
        );
      }

      deletedCount += (result[1] || 0);
    }

    console.log(`✓ ${deletedCount} lecture(s) récente(s) supprimée(s) pour la plantation "Nouveau Champ de Test"`);
  }
}

