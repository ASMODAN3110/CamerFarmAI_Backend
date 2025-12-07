import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSensorReadingsForChampManiocNord1700000015000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver l'utilisateur Pauline Ndoumbé par son email
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['pauline@example.com']
    );

    if (userResult.length === 0) {
      throw new Error('Utilisateur pauline@example.com non trouvé. Veuillez créer cet utilisateur d\'abord.');
    }

    const userId = userResult[0].id;

    // 2. Trouver la plantation "Champ de manioc Nord" de cet utilisateur
    const plantationResult = await queryRunner.query(
      `SELECT id, name FROM plantations WHERE name = $1 AND "ownerId" = $2`,
      ['Champ de manioc Nord', userId]
    );

    if (plantationResult.length === 0) {
      throw new Error('Plantation "Champ de manioc Nord" non trouvée pour l\'utilisateur pauline@example.com. Veuillez créer cette plantation d\'abord.');
    }

    const plantation = plantationResult[0];
    console.log(`✓ Plantation trouvée: "${plantation.name}" (${plantation.id})`);

    // 3. Récupérer tous les capteurs de cette plantation
    const sensors = await queryRunner.query(
      `SELECT id, type FROM sensors WHERE "plantationId" = $1`,
      [plantation.id]
    );

    if (sensors.length === 0) {
      console.log(`⚠ Aucun capteur trouvé pour la plantation "${plantation.name}". Les capteurs seront créés automatiquement lors de la création de la plantation.`);
      return;
    }

    console.log(`✓ ${sensors.length} capteur(s) trouvé(s) pour la plantation "${plantation.name}"`);

    // 4. Créer des lectures pour chaque capteur
    for (const sensor of sensors) {
      // Créer 48 lectures (une toutes les 30 minutes sur les dernières 24 heures)
      // Cela donne plus de données pour un meilleur suivi
      const readings: Array<{ value: number; timestamp: Date }> = [];
      const now = new Date();

      for (let i = 47; i >= 0; i--) {
        // i * 30 minutes en arrière
        const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000);
        
        // Générer une valeur réaliste selon le type de capteur
        // Pour le manioc, on adapte les valeurs aux besoins de cette culture
        let value: number;
        switch (sensor.type) {
          case 'temperature':
            // Température optimale pour le manioc : 25-30°C
            // Variation réaliste avec cycle jour/nuit
            const hour = timestamp.getHours();
            const isDay = hour >= 6 && hour <= 18;
            const baseTemp = isDay ? 28 : 24;
            value = baseTemp + Math.sin(i / 12) * 3 + (Math.random() - 0.5) * 2;
            // Limiter entre 22°C et 32°C
            value = Math.max(22, Math.min(32, value));
            break;
          case 'soilMoisture':
            // Humidité du sol optimale pour le manioc : 50-70%
            // Variation selon l'heure (irrigation possible)
            value = 60 + Math.sin(i / 16) * 8 + (Math.random() - 0.5) * 5;
            // Limiter entre 45% et 75%
            value = Math.max(45, Math.min(75, value));
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
            const hourOfDay = timestamp.getHours();
            const isDaylight = hourOfDay >= 6 && hourOfDay <= 18;
            if (isDaylight) {
              // Jour : pic à midi (12h), variation sinusoïdale
              const progress = (hourOfDay - 6) / 12; // 0 à 1
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

      // 5. Insérer toutes les lectures pour ce capteur
      let insertedCount = 0;
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
        insertedCount++;
      }

      console.log(`✓ ${insertedCount} lectures créées pour le capteur ${sensor.type} de "${plantation.name}"`);
    }

    console.log(`✓ Migration terminée : lectures de capteurs créées pour "${plantation.name}"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer toutes les lectures de la plantation "Champ de manioc Nord"
    
    // 1. Trouver l'utilisateur
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['pauline@example.com']
    );

    if (userResult.length === 0) {
      console.log('⚠ Utilisateur pauline@example.com non trouvé. Aucune suppression effectuée.');
      return;
    }

    const userId = userResult[0].id;

    // 2. Trouver la plantation
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE name = $1 AND "ownerId" = $2`,
      ['Champ de manioc Nord', userId]
    );

    if (plantationResult.length === 0) {
      console.log('⚠ Plantation "Champ de manioc Nord" non trouvée. Aucune suppression effectuée.');
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
      deletedCount += result[1] || 0; // result[1] contient le nombre de lignes supprimées
    }

    console.log(`✓ ${deletedCount} lectures supprimées pour la plantation "Champ de manioc Nord"`);
  }
}

