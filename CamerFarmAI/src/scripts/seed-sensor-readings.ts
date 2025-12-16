// src/scripts/seed-sensor-readings.ts
import { AppDataSource } from '../config/database';
import { Sensor } from '../models/Sensor.entity';
import { SensorReading } from '../models/SensorReading.entity';
import { SensorType } from '../models/Sensor.entity';
import { SensorReadingFactory } from '../fakers/factories/sensor-reading.factory';
import { SeasonalSituation } from '../fakers/config/sensor-ranges.config';
import { Plantation } from '../models/Plantation.entity';

interface CliOptions {
  situation?: SeasonalSituation;
  sensorId?: string;
  count?: number;
  hours?: number;
  allSensors?: boolean;
  plantationId?: string;
  listPlantations?: boolean;
  listSensors?: boolean;
}

/**
 * Valide le format UUID
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Parse les arguments de la ligne de commande
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--situation':
        options.situation = args[++i] as SeasonalSituation;
        break;
      case '--sensor-id':
        options.sensorId = args[++i];
        break;
      case '--count':
        options.count = parseInt(args[++i], 10);
        break;
      case '--hours':
        options.hours = parseInt(args[++i], 10);
        break;
      case '--all-sensors':
        options.allSensors = true;
        break;
      case '--plantation-id':
        options.plantationId = args[++i];
        break;
      case '--list-plantations':
        options.listPlantations = true;
        break;
      case '--list-sensors':
        options.listSensors = true;
        if (args[i + 1] && !args[i + 1].startsWith('--')) {
          options.plantationId = args[++i];
        }
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: npm run seed:sensors [options]

Options:
  --situation <situation>    Situation saisonnière: dry_season, rainy_season, harmattan, transition (défaut: transition)
  --sensor-id <id>          ID du capteur cible (UUID valide)
  --count <number>          Nombre de lectures à générer (défaut: 24)
  --hours <number>          Période couverte en heures (défaut: 24)
  --all-sensors             Générer pour tous les capteurs d'une plantation
  --plantation-id <id>      ID de la plantation (UUID valide, requis si --all-sensors)
  --list-plantations        Lister toutes les plantations disponibles
  --list-sensors [id]       Lister tous les capteurs (optionnel: pour une plantation spécifique)
  --help                    Afficher cette aide

Exemples:
  npm run seed:sensors -- --list-plantations
  npm run seed:sensors -- --list-sensors
  npm run seed:sensors -- --list-sensors <plantation-uuid>
  npm run seed:sensors -- --sensor-id <uuid> --count 48 --hours 48 --situation dry_season
  npm run seed:sensors -- --all-sensors --plantation-id <uuid> --situation rainy_season
`);
}

/**
 * Liste toutes les plantations disponibles
 */
async function listPlantations(): Promise<void> {
  const plantationRepository = AppDataSource.getRepository(Plantation);
  const plantations = await plantationRepository.find({
    select: ['id', 'name', 'location', 'cropType'],
  });

  if (plantations.length === 0) {
    console.log('⚠ Aucune plantation trouvée dans la base de données');
    return;
  }

  console.log('\n📋 Plantations disponibles:\n');
  plantations.forEach((p) => {
    console.log(`  ID: ${p.id}`);
    console.log(`  Nom: ${p.name}`);
    console.log(`  Localisation: ${p.location || 'N/A'}`);
    console.log(`  Type de culture: ${p.cropType || 'N/A'}`);
    console.log('');
  });
}

/**
 * Liste tous les capteurs (optionnel: pour une plantation spécifique)
 */
async function listSensors(plantationId?: string): Promise<void> {
  const sensorRepository = AppDataSource.getRepository(Sensor);
  const where = plantationId ? { plantationId } : {};
  const sensors = await sensorRepository.find({
    where,
    relations: ['plantation'],
    select: {
      id: true,
      type: true,
      status: true,
      plantationId: true,
      plantation: {
        id: true,
        name: true,
      },
    },
  });

  if (sensors.length === 0) {
    const message = plantationId
      ? `⚠ Aucun capteur trouvé pour la plantation ${plantationId}`
      : '⚠ Aucun capteur trouvé dans la base de données';
    console.log(message);
    return;
  }

  console.log(`\n📋 Capteurs disponibles${plantationId ? ` (plantation: ${plantationId})` : ''}:\n`);
  sensors.forEach((s) => {
    console.log(`  ID: ${s.id}`);
    console.log(`  Type: ${s.type}`);
    console.log(`  Statut: ${s.status}`);
    if (s.plantation) {
      console.log(`  Plantation: ${s.plantation.name} (${s.plantation.id})`);
    }
    console.log('');
  });
}

/**
 * Génère des lectures pour un capteur spécifique
 */
async function generateForSensor(
  sensorId: string,
  sensorType: SensorType,
  situation: SeasonalSituation,
  count: number,
  hours: number
): Promise<void> {
  const readings = SensorReadingFactory.generateSeries(sensorType, situation, {
    count,
    hours,
    sensorId,
  });

  const sensorReadingRepository = AppDataSource.getRepository(SensorReading);
  
  // Insérer les lectures
  const entities = readings.map((reading) => {
    const entity = sensorReadingRepository.create({
      value: reading.value!,
      sensorId: reading.sensorId!,
      timestamp: reading.timestamp!,
    });
    return entity;
  });

  await sensorReadingRepository.save(entities);
  console.log(`✓ ${entities.length} lectures générées pour le capteur ${sensorId} (${sensorType})`);
}

/**
 * Génère des lectures pour tous les capteurs d'une plantation
 */
async function generateForPlantation(
  plantationId: string,
  situation: SeasonalSituation,
  count: number,
  hours: number
): Promise<void> {
  const sensorRepository = AppDataSource.getRepository(Sensor);
  const sensors = await sensorRepository.find({
    where: { plantationId },
  });

  if (sensors.length === 0) {
    console.log(`⚠ Aucun capteur trouvé pour la plantation ${plantationId}`);
    return;
  }

  console.log(`📊 Génération de lectures pour ${sensors.length} capteur(s)...`);

  for (const sensor of sensors) {
    await generateForSensor(sensor.id, sensor.type, situation, count, hours);
  }

  console.log(`✓ Toutes les lectures ont été générées pour la plantation ${plantationId}`);
}

/**
 * Script principal
 */
async function main() {
  const options = parseArgs();

  try {
    // Initialiser la connexion à la base de données
    console.log('🔌 Connexion à la base de données...');
    await AppDataSource.initialize();
    console.log('✓ Connexion établie');

    // Gérer les commandes de liste
    if (options.listPlantations) {
      await listPlantations();
      return;
    }

    if (options.listSensors) {
      if (options.plantationId && !isValidUUID(options.plantationId)) {
        console.error(`❌ Format UUID invalide pour --plantation-id: ${options.plantationId}`);
        console.error('   Utilisez --list-plantations pour voir les IDs valides');
        process.exit(1);
      }
      await listSensors(options.plantationId);
      return;
    }

    // Validation des options pour la génération
    if (options.allSensors && !options.plantationId) {
      console.error('❌ --plantation-id est requis lorsque --all-sensors est utilisé');
      console.error('   Utilisez --list-plantations pour voir les plantations disponibles');
      process.exit(1);
    }

    if (!options.allSensors && !options.sensorId) {
      console.error('❌ --sensor-id est requis (ou utilisez --all-sensors avec --plantation-id)');
      console.error('   Utilisez --list-sensors pour voir les capteurs disponibles');
      process.exit(1);
    }

    // Valider les UUIDs
    if (options.sensorId && !isValidUUID(options.sensorId)) {
      console.error(`❌ Format UUID invalide pour --sensor-id: ${options.sensorId}`);
      console.error('   Utilisez --list-sensors pour voir les IDs valides');
      process.exit(1);
    }

    if (options.plantationId && !isValidUUID(options.plantationId)) {
      console.error(`❌ Format UUID invalide pour --plantation-id: ${options.plantationId}`);
      console.error('   Utilisez --list-plantations pour voir les IDs valides');
      process.exit(1);
    }

    const situation = options.situation || 'transition';
    const count = options.count || 24;
    const hours = options.hours || 24;

    if (options.allSensors && options.plantationId) {
      await generateForPlantation(options.plantationId, situation, count, hours);
    } else if (options.sensorId) {
      // Récupérer le capteur pour connaître son type
      const sensorRepository = AppDataSource.getRepository(Sensor);
      const sensor = await sensorRepository.findOne({
        where: { id: options.sensorId },
      });

      if (!sensor) {
        console.error(`❌ Capteur ${options.sensorId} introuvable`);
        console.error('   Utilisez --list-sensors pour voir les capteurs disponibles');
        process.exit(1);
      }

      await generateForSensor(
        options.sensorId,
        sensor.type,
        situation,
        count,
        hours
      );
    }

    console.log('✅ Génération terminée avec succès');
  } catch (error: any) {
    if (error.code === '22P02') {
      console.error('❌ Format UUID invalide');
      console.error('   Utilisez --list-plantations ou --list-sensors pour voir les IDs valides');
    } else {
      console.error('❌ Erreur lors de la génération:', error.message || error);
    }
    process.exit(1);
  } finally {
    // Fermer la connexion
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}
