import { MigrationInterface, QueryRunner } from 'typeorm';

type SeasonalSituation = 'dry_season' | 'rainy_season' | 'harmattan' | 'transition';

interface SeasonalThresholds {
  dry_season: { min: number; max: number };
  rainy_season: { min: number; max: number };
  harmattan: { min: number; max: number };
  transition: { min: number; max: number };
}

// Seuils saisonniers par type de capteur (basés sur seed-mais-sensor-data.ts)
const SEASONAL_THRESHOLDS: Record<string, SeasonalThresholds> = {
  temperature: {
    dry_season: { min: 28, max: 35 },
    rainy_season: { min: 22, max: 28 },
    harmattan: { min: 15, max: 25 },
    transition: { min: 20, max: 30 },
  },
  soilMoisture: {
    dry_season: { min: 30, max: 50 },
    rainy_season: { min: 60, max: 85 },
    harmattan: { min: 20, max: 40 },
    transition: { min: 40, max: 65 },
  },
  co2Level: {
    dry_season: { min: 450, max: 800 },
    rainy_season: { min: 450, max: 800 },
    harmattan: { min: 450, max: 800 },
    transition: { min: 450, max: 800 },
  },
  waterLevel: {
    dry_season: { min: 40, max: 70 },
    rainy_season: { min: 70, max: 90 },
    harmattan: { min: 35, max: 60 },
    transition: { min: 55, max: 80 },
  },
  luminosity: {
    dry_season: { min: 300, max: 1000 },
    rainy_season: { min: 300, max: 1000 },
    harmattan: { min: 300, max: 1000 },
    transition: { min: 300, max: 1000 },
  },
};

/**
 * Détermine la saison actuelle basée sur la date
 * Simplification: utilise le mois pour déterminer la saison
 */
function getCurrentSeason(): SeasonalSituation {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12

  // Répartition approximative pour le Cameroun:
  // Nov-Déc-Jan-Fév: dry_season
  // Mar-Avr: transition
  // Mai-Juin-Juil-Août: rainy_season
  // Sep-Oct: harmattan
  if (month >= 11 || month <= 2) {
    return 'dry_season';
  } else if (month >= 3 && month <= 4) {
    return 'transition';
  } else if (month >= 5 && month <= 8) {
    return 'rainy_season';
  } else {
    return 'harmattan';
  }
}

export class AddSensorsAndSeasonalThresholdsToChampTest1700000017000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ajouter la colonne metadata à la table sensors si elle n'existe pas
    const hasMetadataColumn = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sensors' AND column_name = 'metadata'
    `);

    if (hasMetadataColumn.length === 0) {
      await queryRunner.query(`
        ALTER TABLE sensors 
        ADD COLUMN metadata JSONB
      `);
    }

    // 2. Trouver l'utilisateur Test User
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      ['test.user@example.com', '690123456']
    );

    if (userResult.length === 0) {
      throw new Error('Utilisateur Test User non trouvé. Exécutez d\'abord la migration 1700000005000-SeedUserWithDevices.ts');
    }

    const userId = userResult[0].id;

    // 3. Trouver la plantation "Champ de test"
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE "ownerId" = $1 AND name = $2`,
      [userId, 'Champ de test']
    );

    if (plantationResult.length === 0) {
      throw new Error('Plantation "Champ de test" non trouvée pour l\'utilisateur Test User');
    }

    const plantationId = plantationResult[0].id;

    // 4. Récupérer les capteurs existants
    const existingSensors = await queryRunner.query(
      `SELECT id, type FROM sensors WHERE "plantationId" = $1`,
      [plantationId]
    );

    const existingTypes = existingSensors.map((s: { type: string }) => s.type);
    const allSensorTypes = ['temperature', 'soilMoisture', 'co2Level', 'waterLevel', 'luminosity'];

    // 5. Déterminer la saison actuelle
    const currentSeason = getCurrentSeason();

    // 6. Pour chaque capteur existant, mettre à jour les metadata avec les seuils saisonniers
    for (const sensor of existingSensors) {
      const sensorType = sensor.type;
      const thresholds = SEASONAL_THRESHOLDS[sensorType];
      
      if (thresholds) {
        const metadata = {
          seasonalThresholds: thresholds,
          currentSeason: currentSeason,
        };

        // Mettre à jour les seuils par défaut avec ceux de la saison actuelle
        const currentThresholds = thresholds[currentSeason];
        
        await queryRunner.query(
          `UPDATE sensors 
           SET metadata = $1, "seuilMin" = $2, "seuilMax" = $3, "updatedAt" = NOW()
           WHERE id = $4`,
          [
            JSON.stringify(metadata),
            currentThresholds.min,
            currentThresholds.max,
            sensor.id,
          ]
        );
      }
    }

    // 7. Ajouter les capteurs manquants
    const missingTypes = allSensorTypes.filter(type => !existingTypes.includes(type));

    for (const sensorType of missingTypes) {
      const thresholds = SEASONAL_THRESHOLDS[sensorType];
      
      if (thresholds) {
        const currentThresholds = thresholds[currentSeason];
        const metadata = {
          seasonalThresholds: thresholds,
          currentSeason: currentSeason,
        };

        await queryRunner.query(
          `INSERT INTO sensors (id, type, status, "plantationId", "seuilMin", "seuilMax", metadata, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            sensorType,
            'active',
            plantationId,
            currentThresholds.min,
            currentThresholds.max,
            JSON.stringify(metadata),
          ]
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver l'utilisateur Test User
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      ['test.user@example.com', '690123456']
    );

    if (userResult.length === 0) {
      return; // Utilisateur n'existe pas, rien à faire
    }

    const userId = userResult[0].id;

    // 2. Trouver la plantation "Champ de test"
    const plantationResult = await queryRunner.query(
      `SELECT id FROM plantations WHERE "ownerId" = $1 AND name = $2`,
      [userId, 'Champ de test']
    );

    if (plantationResult.length === 0) {
      return; // Plantation n'existe pas, rien à faire
    }

    const plantationId = plantationResult[0].id;

    // 3. Récupérer tous les capteurs de cette plantation
    const allSensors = await queryRunner.query(
      `SELECT id, type FROM sensors WHERE "plantationId" = $1`,
      [plantationId]
    );

    // 4. Identifier les capteurs ajoutés par cette migration
    // On considère qu'un capteur a été ajouté par cette migration si:
    // - Il a un type parmi ceux qu'on a ajoutés (soilMoisture, co2Level, waterLevel, luminosity)
    // - ET il a des metadata avec seasonalThresholds
    const sensorsToRemove: string[] = [];
    const typesAddedByMigration = ['soilMoisture', 'co2Level', 'waterLevel', 'luminosity'];

    for (const sensor of allSensors) {
      if (typesAddedByMigration.includes(sensor.type)) {
        // Vérifier si le capteur a des metadata avec seasonalThresholds
        const sensorWithMetadata = await queryRunner.query(
          `SELECT metadata FROM sensors WHERE id = $1`,
          [sensor.id]
        );

        if (sensorWithMetadata.length > 0 && sensorWithMetadata[0].metadata) {
          const metadata = sensorWithMetadata[0].metadata;
          if (metadata.seasonalThresholds) {
            sensorsToRemove.push(sensor.id);
          }
        }
      }
    }

    // 5. Supprimer les capteurs ajoutés par cette migration
    if (sensorsToRemove.length > 0) {
      await queryRunner.query(
        `DELETE FROM sensors WHERE id = ANY($1::uuid[])`,
        [sensorsToRemove]
      );
    }

    // 6. Pour les capteurs existants (temperature), supprimer les metadata saisonniers
    // mais garder le capteur lui-même
    const existingSensors = await queryRunner.query(
      `SELECT id FROM sensors WHERE "plantationId" = $1 AND type = $2`,
      [plantationId, 'temperature']
    );

    for (const sensor of existingSensors) {
      await queryRunner.query(
        `UPDATE sensors 
         SET metadata = NULL, "updatedAt" = NOW()
         WHERE id = $1`,
        [sensor.id]
      );
    }

    // Note: On ne supprime pas la colonne metadata car elle pourrait être utilisée ailleurs
  }
}

