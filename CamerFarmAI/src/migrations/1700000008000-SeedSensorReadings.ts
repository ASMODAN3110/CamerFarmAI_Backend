import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSensorReadings1700000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver les plantations "Champ de test" et "Nouveau Champ de Test"
    const plantations = await queryRunner.query(
      `SELECT id, name FROM plantations WHERE name = $1 OR name = $2`,
      ['Champ de test', 'Nouveau Champ de Test']
    );

    if (plantations.length === 0) {
      throw new Error('Aucune plantation trouvée. Exécutez d\'abord les migrations précédentes.');
    }

    // 2. Pour chaque plantation, récupérer tous ses capteurs
    for (const plantation of plantations) {
      const sensors = await queryRunner.query(
        `SELECT id, type FROM sensors WHERE "plantationId" = $1`,
        [plantation.id]
      );

      if (sensors.length === 0) {
        console.log(`Aucun capteur trouvé pour la plantation "${plantation.name}"`);
        continue;
      }

      // 3. Créer des lectures pour chaque capteur
      for (const sensor of sensors) {
        // Créer 24 lectures (une par heure sur les dernières 24 heures)
        const readings: Array<{ value: number; timestamp: Date }> = [];
        const now = new Date();

        for (let i = 23; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // i heures en arrière
          
          // Générer une valeur réaliste selon le type de capteur
          let value: number;
          switch (sensor.type) {
            case 'temperature':
              // Température entre 22°C et 32°C avec variation réaliste
              value = 25 + Math.sin(i / 12) * 5 + (Math.random() - 0.5) * 2;
              break;
            case 'soilMoisture':
              // Humidité du sol entre 40% et 70%
              value = 55 + Math.sin(i / 8) * 10 + (Math.random() - 0.5) * 5;
              break;
            case 'co2Level':
              // Niveau de CO2 entre 400 ppm et 800 ppm
              value = 600 + Math.sin(i / 6) * 150 + (Math.random() - 0.5) * 50;
              break;
            case 'waterLevel':
              // Niveau d'eau entre 60% et 90%
              value = 75 + Math.sin(i / 10) * 10 + (Math.random() - 0.5) * 5;
              break;
            case 'luminosity':
              // Luminosité entre 200 lux (nuit) et 800 lux (jour)
              // Simulation jour/nuit : plus bas la nuit (i > 18 ou i < 6)
              const isDay = i >= 6 && i <= 18;
              value = isDay 
                ? 500 + Math.sin((i - 6) / 12 * Math.PI) * 200 + (Math.random() - 0.5) * 50
                : 150 + (Math.random() - 0.5) * 50;
              break;
            default:
              // Valeur par défaut
              value = 50 + (Math.random() - 0.5) * 20;
          }

          // Arrondir à 2 décimales
          value = Math.round(value * 100) / 100;
          
          readings.push({ value, timestamp });
        }

        // 4. Insérer toutes les lectures pour ce capteur
        // On utilise une requête par lecture pour éviter les problèmes de paramètres
        for (const reading of readings) {
          await queryRunner.query(
            `INSERT INTO sensor_readings (id, value, "sensorId", timestamp)
             VALUES (gen_random_uuid(), $1, $2, $3)`,
            [
              reading.value,
              sensor.id,
              reading.timestamp.toISOString(),
            ]
          );
        }

        console.log(`✓ ${readings.length} lectures créées pour le capteur ${sensor.type} de "${plantation.name}"`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer toutes les lectures des plantations "Champ de test" et "Nouveau Champ de Test"
    
    // 1. Trouver les plantations
    const plantations = await queryRunner.query(
      `SELECT id FROM plantations WHERE name = $1 OR name = $2`,
      ['Champ de test', 'Nouveau Champ de Test']
    );

    if (plantations.length > 0) {
      // 2. Pour chaque plantation, trouver ses capteurs et supprimer leurs lectures
      for (const plantation of plantations) {
        const sensors = await queryRunner.query(
          `SELECT id FROM sensors WHERE "plantationId" = $1`,
          [plantation.id]
        );

        if (sensors.length > 0) {
          // 3. Supprimer toutes les lectures de ces capteurs
          for (const sensor of sensors) {
            await queryRunner.query(
              `DELETE FROM sensor_readings WHERE "sensorId" = $1`,
              [sensor.id]
            );
          }

          console.log(`✓ ${sensors.length} capteurs nettoyés pour la plantation ${plantation.id}`);
        }
      }
    }
  }
}

