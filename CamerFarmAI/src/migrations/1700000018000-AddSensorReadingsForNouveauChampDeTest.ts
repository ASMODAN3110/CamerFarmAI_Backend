import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSensorReadingsForNouveauChampDeTest1700000018000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver l'utilisateur "Test User" par email ou téléphone
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      ['test.user@example.com', '690123456']
    );

    if (userResult.length === 0) {
      throw new Error('Utilisateur test.user@example.com non trouvé. Exécutez d\'abord la migration 1700000005000-SeedUserWithDevices.ts');
    }

    const userId = userResult[0].id;

    // 2. Trouver ou créer la plantation "Nouveau Champ de Test"
    let plantationResult = await queryRunner.query(
      `SELECT id, name FROM plantations WHERE name = $1 AND "ownerId" = $2`,
      ['Nouveau Champ de Test', userId]
    );

    let plantationId: string;

    if (plantationResult.length === 0) {
      // Créer la plantation avec la date spécifiée (29/11/2025)
      const createdAt = new Date('2025-11-29T00:00:00.000Z');
      
      plantationResult = await queryRunner.query(
        `INSERT INTO plantations (id, name, location, area, "cropType", "ownerId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $6)
         RETURNING id`,
        [
          'Nouveau Champ de Test',
          'Yaoundé',
          3.0,
          'cacao',
          userId,
          createdAt.toISOString(),
        ]
      );
      
      plantationId = plantationResult[0].id;
      console.log(`✓ Plantation créée: "Nouveau Champ de Test" (${plantationId})`);

      // Créer les capteurs par défaut pour cette plantation
      const sensorTypes = ['temperature', 'soilMoisture', 'co2Level', 'waterLevel', 'luminosity'];
      for (const sensorType of sensorTypes) {
        await queryRunner.query(
          `INSERT INTO sensors (id, type, status, "plantationId", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $4)`,
          [
            sensorType,
            'active',
            plantationId,
            createdAt.toISOString(),
          ]
        );
      }
      console.log(`✓ ${sensorTypes.length} capteurs créés pour la plantation`);
    } else {
      plantationId = plantationResult[0].id;
      console.log(`✓ Plantation trouvée: "Nouveau Champ de Test" (${plantationId})`);
    }

    // 3. Récupérer tous les capteurs de cette plantation
    const sensors = await queryRunner.query(
      `SELECT id, type FROM sensors WHERE "plantationId" = $1`,
      [plantationId]
    );

    if (sensors.length === 0) {
      console.log(`⚠ Aucun capteur trouvé pour la plantation "Nouveau Champ de Test". Création des capteurs par défaut...`);
      
      // Créer les 5 capteurs par défaut
      const sensorTypes = ['temperature', 'soilMoisture', 'co2Level', 'waterLevel', 'luminosity'];
      
      for (const sensorType of sensorTypes) {
        const sensorResult = await queryRunner.query(
          `INSERT INTO sensors (id, type, status, "plantationId", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
           RETURNING id`,
          [
            sensorType,
            'active',
            plantationId,
          ]
        );
        
        sensors.push({
          id: sensorResult[0].id,
          type: sensorType,
        });
      }
      console.log(`✓ ${sensorTypes.length} capteurs créés`);
    }

    console.log(`✓ ${sensors.length} capteur(s) trouvé(s) pour la plantation "Nouveau Champ de Test"`);

    // 4. Créer des lectures pour chaque capteur
    // Date de référence : 28/12/2025 à 02h30, on crée des lectures récentes sur les dernières 24 heures
    // Les lectures seront donc datées du 27/12/2025 02h30 au 28/12/2025 02h30
    const baseDate = new Date('2025-12-28T04:30:00.000Z'); // 28/12/2025 à 02h30
    
    for (const sensor of sensors) {
      // Créer 48 lectures (une toutes les 30 minutes sur les dernières 24 heures)
      const readings: Array<{ value: number; timestamp: Date }> = [];
      
      // Calculer le point de départ (48 * 30 minutes = 24 heures en arrière depuis baseDate)
      // Cela donne des lectures du 27/12/2025 02h30 au 28/12/2025 02h30
      const startTime = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);

      for (let i = 0; i < 48; i++) {
        // i * 30 minutes depuis startTime
        const timestamp = new Date(startTime.getTime() + i * 30 * 60 * 1000);
        
        // Générer une valeur réaliste selon le type de capteur
        // Pour le cacao, on adapte les valeurs aux besoins de cette culture
        let value: number;
        const hour = timestamp.getHours();
        const isDay = hour >= 6 && hour <= 18;
        
        switch (sensor.type) {
          case 'temperature':
            // Température optimale pour le cacao : 20-30°C
            // Variation réaliste avec cycle jour/nuit
            const baseTemp = isDay ? 28 : 23;
            value = baseTemp + Math.sin(i / 12) * 4 + (Math.random() - 0.5) * 2;
            // Limiter entre 20°C et 32°C
            value = Math.max(20, Math.min(32, value));
            break;
          case 'soilMoisture':
            // Humidité du sol optimale pour le cacao : 50-80%
            // Variation selon l'heure (irrigation possible)
            value = 65 + Math.sin(i / 16) * 10 + (Math.random() - 0.5) * 5;
            // Limiter entre 50% et 85%
            value = Math.max(50, Math.min(85, value));
            break;
          case 'co2Level':
            // Niveau de CO2 normal : 400-800 ppm
            // Légère variation avec photosynthèse
            value = 500 + Math.sin(i / 8) * 150 + (Math.random() - 0.5) * 50;
            // Limiter entre 400 ppm et 850 ppm
            value = Math.max(400, Math.min(850, value));
            break;
          case 'waterLevel':
            // Niveau d'eau du réservoir : 60-90%
            // Diminue progressivement puis remonte (simulation irrigation)
            value = 75 + Math.sin(i / 20) * 12 + (Math.random() - 0.5) * 5;
            // Limiter entre 55% et 95%
            value = Math.max(55, Math.min(95, value));
            break;
          case 'luminosity':
            // Luminosité avec cycle jour/nuit réaliste
            if (isDay) {
              // Jour : pic à midi (12h), variation sinusoïdale
              const progress = (hour - 6) / 12; // 0 à 1
              const peak = Math.sin(progress * Math.PI);
              value = 300 + peak * 500 + (Math.random() - 0.5) * 100;
            } else {
              // Nuit : faible luminosité
              value = 50 + (Math.random() - 0.5) * 30;
            }
            // Limiter entre 0 lux et 1000 lux
            value = Math.max(0, Math.min(1000, value));
            break;
          default:
            // Valeur par défaut pour les types inconnus
            value = 50 + (Math.random() - 0.5) * 20;
        }

        // Arrondir à 2 décimales
        value = Math.round(value * 100) / 100;
        
        readings.push({ value, timestamp });
      }

      // 5. Vérifier si des lectures existent déjà pour ce capteur
      const existingReadings = await queryRunner.query(
        `SELECT COUNT(*) as count FROM sensor_readings WHERE "sensorId" = $1`,
        [sensor.id]
      );

      const existingCount = parseInt(existingReadings[0].count);

      if (existingCount > 0) {
        console.log(`⚠ ${existingCount} lecture(s) existante(s) pour le capteur ${sensor.type}. Ajout de nouvelles lectures...`);
      }

      // 6. Insérer toutes les lectures pour ce capteur
      let insertedCount = 0;
      for (const reading of readings) {
        // Vérifier si une lecture avec le même timestamp existe déjà (éviter les doublons)
        const duplicateCheck = await queryRunner.query(
          `SELECT id FROM sensor_readings WHERE "sensorId" = $1 AND timestamp = $2`,
          [sensor.id, reading.timestamp.toISOString()]
        );

        if (duplicateCheck.length === 0) {
          await queryRunner.query(
            `INSERT INTO sensor_readings (id, value, "sensorId", timestamp)
             VALUES (gen_random_uuid(), $1, $2, $3)`,
            [
              reading.value,
              sensor.id,
              reading.timestamp.toISOString(),
            ]
          );
          insertedCount++;
        }
      }

      console.log(`✓ ${insertedCount} lectures créées pour le capteur ${sensor.type} de "Nouveau Champ de Test"`);

      // 7. Activer le capteur s'il était inactif en ajoutant une lecture récente
      // Vérifier le statut actuel du capteur
      const sensorStatus = await queryRunner.query(
        `SELECT status FROM sensors WHERE id = $1`,
        [sensor.id]
      );

      if (sensorStatus.length > 0 && sensorStatus[0].status === 'inactive') {
        // Le capteur est inactif, ajouter une lecture récente (28/12/2025 à 02h25, 5 min avant 02h30) pour l'activer
        const recentTimestamp = new Date('2025-12-28T04:25:00.000Z'); // 28/12/2025 à 02h25 (5 minutes avant 02h30)
        
        // Générer une valeur réaliste pour la lecture récente
        let recentValue: number;
        const hour = recentTimestamp.getHours();
        const isDay = hour >= 6 && hour <= 18;
        
        switch (sensor.type) {
          case 'temperature':
            const baseTemp = isDay ? 28 : 23;
            recentValue = baseTemp + (Math.random() - 0.5) * 2;
            recentValue = Math.max(20, Math.min(32, recentValue));
            break;
          case 'soilMoisture':
            recentValue = 65 + (Math.random() - 0.5) * 5;
            recentValue = Math.max(50, Math.min(85, recentValue));
            break;
          case 'co2Level':
            recentValue = 500 + (Math.random() - 0.5) * 50;
            recentValue = Math.max(400, Math.min(850, recentValue));
            break;
          case 'waterLevel':
            recentValue = 75 + (Math.random() - 0.5) * 5;
            recentValue = Math.max(55, Math.min(95, recentValue));
            break;
          case 'luminosity':
            if (isDay) {
              recentValue = 500 + (Math.random() - 0.5) * 100;
            } else {
              recentValue = 50 + (Math.random() - 0.5) * 30;
            }
            recentValue = Math.max(0, Math.min(1000, recentValue));
            break;
          default:
            recentValue = 50 + (Math.random() - 0.5) * 20;
        }
        
        recentValue = Math.round(recentValue * 100) / 100;

        // Vérifier si une lecture récente existe déjà (moins d'1 heure avant 02h30)
        const oneHourAgo = new Date(baseDate.getTime() - 60 * 60 * 1000); // 28/12/2025 à 01h30
        const existingRecentReading = await queryRunner.query(
          `SELECT id FROM sensor_readings 
           WHERE "sensorId" = $1 AND timestamp > $2 
           ORDER BY timestamp DESC LIMIT 1`,
          [sensor.id, oneHourAgo.toISOString()]
        );

        if (existingRecentReading.length === 0) {
          // Ajouter la lecture récente
          await queryRunner.query(
            `INSERT INTO sensor_readings (id, value, "sensorId", timestamp)
             VALUES (gen_random_uuid(), $1, $2, $3)`,
            [recentValue, sensor.id, recentTimestamp.toISOString()]
          );
          console.log(`  → Lecture récente ajoutée pour activer le capteur ${sensor.type} (valeur: ${recentValue})`);
        }

        // Mettre à jour le statut du capteur à ACTIVE
        await queryRunner.query(
          `UPDATE sensors SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
          ['active', sensor.id]
        );
        console.log(`  → Capteur ${sensor.type} activé`);
      }
    }

    console.log(`✓ Migration terminée : lectures de capteurs créées pour "Nouveau Champ de Test"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer toutes les lectures de la plantation "Nouveau Champ de Test"
    
    // 1. Trouver l'utilisateur
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      ['test.user@example.com', '690123456']
    );

    if (userResult.length === 0) {
      console.log('⚠ Utilisateur test.user@example.com non trouvé. Aucune suppression effectuée.');
      return;
    }

    const userId = userResult[0].id;

    // 2. Trouver la plantation
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE name = $1 AND "ownerId" = $2`,
      ['Nouveau Champ de Test', userId]
    );

    if (plantationResult.length === 0) {
      console.log('⚠ Plantation "Nouveau Champ de Test" non trouvée. Aucune suppression effectuée.');
      return;
    }

    const plantationId = plantationResult[0].id;

    // 3. Trouver tous les capteurs de cette plantation
    const sensors = await queryRunner.query(
      `SELECT id FROM sensors WHERE "plantationId" = $1`,
      [plantationId]
    );

    if (sensors.length === 0) {
      console.log('⚠ Aucun capteur trouvé pour cette plantation.');
      return;
    }

    // 4. Supprimer toutes les lectures de ces capteurs
    let deletedCount = 0;
    for (const sensor of sensors) {
      const result = await queryRunner.query(
        `DELETE FROM sensor_readings WHERE "sensorId" = $1`,
        [sensor.id]
      );
      // Note: result[1] peut contenir le nombre de lignes supprimées selon la version de TypeORM
      deletedCount += (result[1] || 0);
    }

    console.log(`✓ ${deletedCount} lectures supprimées pour la plantation "Nouveau Champ de Test"`);
  }
}

