// src/scripts/generate-fakers.ts
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { Plantation } from '../models/Plantation.entity';
import { Sensor, SensorType } from '../models/Sensor.entity';
import { SensorReading } from '../models/SensorReading.entity';
import { Event } from '../models/Event.entity';
import { Notification } from '../models/Notification.entity';
import { Actuator } from '../models/Actuator.entity';
import { faker } from '@faker-js/faker';

import { UserFactory } from '../fakers/factories/user.factory';
import { PlantationFactory } from '../fakers/factories/plantation.factory';
import { SensorFactory } from '../fakers/factories/sensor.factory';
import { SensorReadingFactory } from '../fakers/factories/sensor-reading.factory';
import { ActuatorFactory } from '../fakers/factories/actuator.factory';
import { EventFactory } from '../fakers/factories/event.factory';
import { NotificationFactory } from '../fakers/factories/notification.factory';

import { calculateDistribution, ScenarioType, getScenarioConfig, EntityDistribution } from '../fakers/config/scenarios.config';
import { generateRandomSeasonalSituation, generateThresholdsByScenario } from '../fakers/helpers/scenario-helpers';
import { SeasonalSituation } from '../fakers/config/sensor-ranges.config';
import * as fs from 'fs';
import * as path from 'path';

interface CliOptions {
  count?: number;
  scenario?: ScenarioType;
  entity?: string;
  distribution?: string;
  save?: boolean;
  output?: string;
}

interface GeneratedData {
  users: Partial<User>[];
  plantations: Partial<Plantation>[];
  sensors: Partial<Sensor>[];
  sensorReadings: Partial<SensorReading>[];
  actuators: Partial<Actuator>[];
  events: Partial<Event>[];
  notifications: Partial<Notification>[];
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
      case '--count':
        options.count = parseInt(args[++i], 10);
        break;
      case '--scenario':
        options.scenario = args[++i] as ScenarioType;
        break;
      case '--entity':
        options.entity = args[++i];
        break;
      case '--distribution':
        options.distribution = args[++i];
        break;
      case '--save':
        options.save = true;
        break;
      case '--output':
        options.output = args[++i];
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
Usage: npm run seed:fakers [options]

Options:
  --count <number>          Nombre total de fakers à générer (défaut: 1000)
  --scenario <type>        Scénario: normal, edge, alert, seasonal, mixed (défaut: mixed)
  --entity <type>          Générer seulement une entité: User, Plantation, Sensor, SensorReading, Event, Notification, Actuator
  --distribution <file>    Fichier JSON de distribution personnalisée
  --save                   Sauvegarder dans la base de données
  --output <file>          Exporter en JSON (ex: test-data.json)
  --help                   Afficher cette aide

Exemples:
  npm run seed:fakers
  npm run seed:fakers -- --scenario alert --count 500
  npm run seed:fakers -- --entity SensorReading --count 1000
  npm run seed:fakers -- --save
  npm run seed:fakers -- --output test-data.json
`);
}

/**
 * Charge une distribution personnalisée depuis un fichier
 */
function loadCustomDistribution(filePath: string): Partial<EntityDistribution> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de la distribution: ${error}`);
    return null;
  }
}

/**
 * Génère toutes les entités selon la distribution
 */
async function generateAllEntities(
  distribution: EntityDistribution,
  scenario: ScenarioType
): Promise<GeneratedData> {
  const data: GeneratedData = {
    users: [],
    plantations: [],
    sensors: [],
    sensorReadings: [],
    actuators: [],
    events: [],
    notifications: [],
  };

  console.log(`\n📊 Génération avec scénario: ${getScenarioConfig(scenario).name}`);
  console.log(`📋 Distribution:`, distribution);

  // 1. Générer les Users
  if (distribution.User > 0) {
    console.log(`\n👥 Génération de ${distribution.User} utilisateur(s)...`);
    data.users = await UserFactory.createBatch(distribution.User);
    // Générer des IDs pour les users
    data.users.forEach(user => {
      if (!user.id) user.id = faker.string.uuid();
    });
    console.log(`✓ ${data.users.length} utilisateur(s) généré(s)`);
  }

  // 2. Générer les Plantations (liées aux Users)
  if (distribution.Plantation > 0 && data.users.length > 0) {
    console.log(`\n🌾 Génération de ${distribution.Plantation} plantation(s)...`);
    for (let i = 0; i < distribution.Plantation; i++) {
      const ownerIndex = i % data.users.length;
      const ownerId = data.users[ownerIndex].id as string;
      const plantation = PlantationFactory.create({ ownerId });
      if (!plantation.id) plantation.id = faker.string.uuid();
      data.plantations.push(plantation);
    }
    console.log(`✓ ${data.plantations.length} plantation(s) générée(s)`);
  }

  // 3. Générer les Sensors (liés aux Plantations)
  if (distribution.Sensor > 0 && data.plantations.length > 0) {
    console.log(`\n📡 Génération de ${distribution.Sensor} capteur(s)...`);
    const sensorTypes = Object.values(SensorType);
    for (let i = 0; i < distribution.Sensor; i++) {
      const plantationIndex = i % data.plantations.length;
      const plantationId = data.plantations[plantationIndex].id as string;
      const sensorType = sensorTypes[i % sensorTypes.length];
      const thresholds = generateThresholdsByScenario(sensorType, scenario);
      const sensor = SensorFactory.createWithThresholds({
        plantationId,
        type: sensorType,
        seuilMin: thresholds.min,
        seuilMax: thresholds.max,
      });
      if (!sensor.id) sensor.id = faker.string.uuid();
      data.sensors.push(sensor);
    }
    console.log(`✓ ${data.sensors.length} capteur(s) généré(s)`);
  }

  // 4. Générer les Actuators (liés aux Plantations)
  if (distribution.Actuator > 0 && data.plantations.length > 0) {
    console.log(`\n⚙️  Génération de ${distribution.Actuator} actionneur(s)...`);
    for (let i = 0; i < distribution.Actuator; i++) {
      const plantationIndex = i % data.plantations.length;
      const plantationId = data.plantations[plantationIndex].id as string;
      const actuator = ActuatorFactory.create({ plantationId });
      if (!actuator.id) actuator.id = faker.string.uuid();
      data.actuators.push(actuator);
    }
    console.log(`✓ ${data.actuators.length} actionneur(s) généré(s)`);
  }

  // 5. Générer les SensorReadings (liés aux Sensors)
  if (distribution.SensorReading > 0 && data.sensors.length > 0) {
    console.log(`\n📊 Génération de ${distribution.SensorReading} lecture(s) de capteur(s)...`);
    const situation = scenario === 'seasonal' 
      ? generateRandomSeasonalSituation()
      : ('transition' as SeasonalSituation);
    
    const readingsPerSensor = Math.ceil(distribution.SensorReading / data.sensors.length);
    
    for (const sensor of data.sensors) {
      const sensorId = sensor.id as string;
      const sensorType = sensor.type!;
      const count = Math.min(readingsPerSensor, distribution.SensorReading - data.sensorReadings.length);
      
      if (count > 0) {
        const readings = SensorReadingFactory.generateSeries(sensorType, situation, {
          count,
          hours: count,
          sensorId,
        });
        readings.forEach(reading => { if (!reading.id) reading.id = faker.string.uuid(); });
        data.sensorReadings.push(...readings);
      }
    }
    console.log(`✓ ${data.sensorReadings.length} lecture(s) générée(s)`);
  }

  // 6. Générer les Events (liés aux Sensors/Actuators)
  if (distribution.Event > 0) {
    console.log(`\n📅 Génération de ${distribution.Event} événement(s)...`);
    const eventSources: Array<{ type: 'sensor' | 'actuator'; id: string; sensorType?: SensorType; actuatorName?: string }> = [];
    
    // Ajouter les sensors pour événements de seuil
    data.sensors.forEach(sensor => {
      eventSources.push({ type: 'sensor', id: sensor.id as string, sensorType: sensor.type });
    });
    
    // Ajouter les actuators pour événements d'actionneurs
    data.actuators.forEach(actuator => {
      eventSources.push({ type: 'actuator', id: actuator.id as string, actuatorName: actuator.name });
    });
    
    for (let i = 0; i < distribution.Event; i++) {
      if (eventSources.length === 0) break;
      
      const source = eventSources[i % eventSources.length];
      let event: Partial<Event>;
      
      if (source.type === 'sensor') {
        event = EventFactory.createThresholdExceeded(source.id, source.sensorType);
      } else {
        const isActivated = Math.random() > 0.5;
        event = isActivated
          ? EventFactory.createActuatorActivated(source.id, source.actuatorName)
          : EventFactory.createActuatorDeactivated(source.id, source.actuatorName);
      }
      
      if (!event.id) event.id = faker.string.uuid();
      data.events.push(event);
    }
    console.log(`✓ ${data.events.length} événement(s) généré(s)`);
  }

  // 7. Générer les Notifications (liées aux Events et Users)
  if (distribution.Notification > 0 && data.events.length > 0 && data.users.length > 0) {
    console.log(`\n🔔 Génération de ${distribution.Notification} notification(s)...`);
    for (let i = 0; i < distribution.Notification; i++) {
      const eventIndex = i % data.events.length;
      const userIndex = i % data.users.length;
      const eventId = data.events[eventIndex].id as string;
      const userId = data.users[userIndex].id as string;
      
      const notification = NotificationFactory.create({
        eventId,
        userId,
      });
      if (!notification.id) notification.id = faker.string.uuid();
      data.notifications.push(notification);
    }
    console.log(`✓ ${data.notifications.length} notification(s) générée(s)`);
  }

  return data;
}

/**
 * Génère une seule entité
 */
async function generateSingleEntity(
  entityType: string,
  count: number,
  scenario: ScenarioType
): Promise<GeneratedData> {
  const data: GeneratedData = {
    users: [],
    plantations: [],
    sensors: [],
    sensorReadings: [],
    actuators: [],
    events: [],
    notifications: [],
  };

  console.log(`\n📊 Génération de ${count} ${entityType}(s) avec scénario: ${getScenarioConfig(scenario).name}`);

  switch (entityType.toLowerCase()) {
    case 'user':
      data.users = await UserFactory.createBatch(count);
      data.users.forEach(user => { if (!user.id) user.id = faker.string.uuid(); });
      break;
    case 'plantation':
      // Besoin d'au moins un user
      const tempUsers = await UserFactory.createBatch(1);
      tempUsers.forEach(user => { if (!user.id) user.id = faker.string.uuid(); });
      data.users = tempUsers;
      for (let i = 0; i < count; i++) {
        const plantation = PlantationFactory.create({ ownerId: tempUsers[0].id as string });
        if (!plantation.id) plantation.id = faker.string.uuid();
        data.plantations.push(plantation);
      }
      break;
    case 'sensor':
      // Besoin d'au moins une plantation
      const tempUsers2 = await UserFactory.createBatch(1);
      tempUsers2.forEach(user => { if (!user.id) user.id = faker.string.uuid(); });
      const tempPlantation = PlantationFactory.create({ ownerId: tempUsers2[0].id as string });
      if (!tempPlantation.id) tempPlantation.id = faker.string.uuid();
      data.users = tempUsers2;
      data.plantations = [tempPlantation];
      for (let i = 0; i < count; i++) {
        const sensorType = Object.values(SensorType)[i % Object.values(SensorType).length];
        const thresholds = generateThresholdsByScenario(sensorType, scenario);
        const sensor = SensorFactory.createWithThresholds({
          plantationId: tempPlantation.id as string,
          type: sensorType,
          seuilMin: thresholds.min,
          seuilMax: thresholds.max,
        });
        if (!sensor.id) sensor.id = faker.string.uuid();
        data.sensors.push(sensor);
      }
      break;
    case 'sensorreading':
      // Besoin d'au moins un sensor
      const tempUsers3 = await UserFactory.createBatch(1);
      tempUsers3.forEach(user => { if (!user.id) user.id = faker.string.uuid(); });
      const tempPlantation2 = PlantationFactory.create({ ownerId: tempUsers3[0].id as string });
      if (!tempPlantation2.id) tempPlantation2.id = faker.string.uuid();
      const tempSensor = SensorFactory.createWithThresholds({
        plantationId: tempPlantation2.id as string,
        type: SensorType.TEMPERATURE,
      });
      if (!tempSensor.id) tempSensor.id = faker.string.uuid();
      data.users = tempUsers3;
      data.plantations = [tempPlantation2];
      data.sensors = [tempSensor];
      
      const situation = scenario === 'seasonal' 
        ? generateRandomSeasonalSituation()
        : ('transition' as SeasonalSituation);
      const readings = SensorReadingFactory.generateSeries(SensorType.TEMPERATURE, situation, {
        count,
        hours: count,
        sensorId: tempSensor.id as string,
      });
      readings.forEach(reading => { if (!reading.id) reading.id = faker.string.uuid(); });
      data.sensorReadings = readings;
      break;
    case 'actuator':
      // Besoin d'au moins une plantation
      const tempUsers4 = await UserFactory.createBatch(1);
      tempUsers4.forEach(user => { if (!user.id) user.id = faker.string.uuid(); });
      const tempPlantation3 = PlantationFactory.create({ ownerId: tempUsers4[0].id as string });
      if (!tempPlantation3.id) tempPlantation3.id = faker.string.uuid();
      data.users = tempUsers4;
      data.plantations = [tempPlantation3];
      for (let i = 0; i < count; i++) {
        const actuator = ActuatorFactory.create({ plantationId: tempPlantation3.id as string });
        if (!actuator.id) actuator.id = faker.string.uuid();
        data.actuators.push(actuator);
      }
      break;
    case 'event':
      // Besoin d'au moins un sensor
      const tempUsers5 = await UserFactory.createBatch(1);
      tempUsers5.forEach(user => { if (!user.id) user.id = faker.string.uuid(); });
      const tempPlantation4 = PlantationFactory.create({ ownerId: tempUsers5[0].id as string });
      if (!tempPlantation4.id) tempPlantation4.id = faker.string.uuid();
      const tempSensor2 = SensorFactory.createWithThresholds({
        plantationId: tempPlantation4.id as string,
        type: SensorType.TEMPERATURE,
      });
      if (!tempSensor2.id) tempSensor2.id = faker.string.uuid();
      data.users = tempUsers5;
      data.plantations = [tempPlantation4];
      data.sensors = [tempSensor2];
      
      for (let i = 0; i < count; i++) {
        const event = EventFactory.createThresholdExceeded(tempSensor2.id as string, SensorType.TEMPERATURE);
        if (!event.id) event.id = faker.string.uuid();
        data.events.push(event);
      }
      break;
    case 'notification':
      // Besoin d'au moins un event et un user
      const tempUsers6 = await UserFactory.createBatch(1);
      tempUsers6.forEach(user => { if (!user.id) user.id = faker.string.uuid(); });
      const tempPlantation5 = PlantationFactory.create({ ownerId: tempUsers6[0].id as string });
      if (!tempPlantation5.id) tempPlantation5.id = faker.string.uuid();
      const tempSensor3 = SensorFactory.createWithThresholds({
        plantationId: tempPlantation5.id as string,
        type: SensorType.TEMPERATURE,
      });
      if (!tempSensor3.id) tempSensor3.id = faker.string.uuid();
      const tempEvent = EventFactory.createThresholdExceeded(tempSensor3.id as string, SensorType.TEMPERATURE);
      if (!tempEvent.id) tempEvent.id = faker.string.uuid();
      data.users = tempUsers6;
      data.plantations = [tempPlantation5];
      data.sensors = [tempSensor3];
      data.events = [tempEvent];
      
      for (let i = 0; i < count; i++) {
        const notification = NotificationFactory.create({
          eventId: tempEvent.id as string,
          userId: tempUsers6[0].id as string,
        });
        if (!notification.id) notification.id = faker.string.uuid();
        data.notifications.push(notification);
      }
      break;
    default:
      console.error(`❌ Type d'entité inconnu: ${entityType}`);
      process.exit(1);
  }

  return data;
}

/**
 * Sauvegarde les données dans la base de données
 */
async function saveToDatabase(data: GeneratedData): Promise<void> {
  console.log('\n💾 Sauvegarde dans la base de données...');
  
  const userRepo = AppDataSource.getRepository(User);
  const plantationRepo = AppDataSource.getRepository(Plantation);
  const sensorRepo = AppDataSource.getRepository(Sensor);
  const sensorReadingRepo = AppDataSource.getRepository(SensorReading);
  const actuatorRepo = AppDataSource.getRepository(Actuator);
  const eventRepo = AppDataSource.getRepository(Event);
  const notificationRepo = AppDataSource.getRepository(Notification);

  // Sauvegarder dans l'ordre des dépendances
  if (data.users.length > 0) {
    const users = data.users.map(u => userRepo.create(u));
    await userRepo.save(users);
    console.log(`✓ ${users.length} utilisateur(s) sauvegardé(s)`);
  }

  if (data.plantations.length > 0) {
    const plantations = data.plantations.map(p => plantationRepo.create(p));
    await plantationRepo.save(plantations);
    console.log(`✓ ${plantations.length} plantation(s) sauvegardée(s)`);
  }

  if (data.sensors.length > 0) {
    const sensors = data.sensors.map(s => sensorRepo.create(s));
    await sensorRepo.save(sensors);
    console.log(`✓ ${sensors.length} capteur(s) sauvegardé(s)`);
  }

  if (data.actuators.length > 0) {
    const actuators = data.actuators.map(a => actuatorRepo.create(a));
    await actuatorRepo.save(actuators);
    console.log(`✓ ${actuators.length} actionneur(s) sauvegardé(s)`);
  }

  if (data.sensorReadings.length > 0) {
    const readings = data.sensorReadings.map(r => sensorReadingRepo.create(r));
    await sensorReadingRepo.save(readings);
    console.log(`✓ ${readings.length} lecture(s) sauvegardée(s)`);
  }

  if (data.events.length > 0) {
    const events = data.events.map(e => eventRepo.create(e));
    await eventRepo.save(events);
    console.log(`✓ ${events.length} événement(s) sauvegardé(s)`);
  }

  if (data.notifications.length > 0) {
    const notifications = data.notifications.map(n => notificationRepo.create(n));
    await notificationRepo.save(notifications);
    console.log(`✓ ${notifications.length} notification(s) sauvegardée(s)`);
  }
}

/**
 * Exporte les données en JSON
 */
function exportToJSON(data: GeneratedData, filePath: string): void {
  console.log(`\n📄 Export vers ${filePath}...`);
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, json, 'utf-8');
  console.log(`✓ Données exportées avec succès`);
}

/**
 * Script principal
 */
async function main() {
  const options = parseArgs();
  const count = options.count || 1000;
  const scenario: ScenarioType = options.scenario || 'mixed';
  const entity = options.entity;

  try {
    // Charger la distribution personnalisée si fournie
    let customDistribution: Partial<EntityDistribution> | null = null;
    if (options.distribution) {
      customDistribution = loadCustomDistribution(options.distribution);
      if (!customDistribution) {
        process.exit(1);
      }
    }

    // Initialiser la connexion à la base de données si nécessaire
    if (options.save) {
      console.log('🔌 Connexion à la base de données...');
      await AppDataSource.initialize();
      console.log('✓ Connexion établie');
    }

    let data: GeneratedData;

    if (entity) {
      // Générer une seule entité
      data = await generateSingleEntity(entity, count, scenario);
    } else {
      // Générer toutes les entités selon la distribution
      const distribution = calculateDistribution(count, customDistribution || undefined);
      data = await generateAllEntities(distribution, scenario);
    }

    // Résumé
    console.log('\n📊 Résumé de la génération:');
    console.log(`  - Users: ${data.users.length}`);
    console.log(`  - Plantations: ${data.plantations.length}`);
    console.log(`  - Sensors: ${data.sensors.length}`);
    console.log(`  - SensorReadings: ${data.sensorReadings.length}`);
    console.log(`  - Actuators: ${data.actuators.length}`);
    console.log(`  - Events: ${data.events.length}`);
    console.log(`  - Notifications: ${data.notifications.length}`);
    console.log(`  - Total: ${Object.values(data).reduce((sum, arr) => sum + arr.length, 0)}`);

    // Sauvegarder ou exporter
    if (options.save) {
      await saveToDatabase(data);
    }

    if (options.output) {
      exportToJSON(data, options.output);
    }

    if (!options.save && !options.output) {
      console.log('\n💡 Astuce: Utilisez --save pour sauvegarder dans la DB ou --output pour exporter en JSON');
    }

    console.log('\n✅ Génération terminée avec succès');
  } catch (error: any) {
    console.error('❌ Erreur lors de la génération:', error.message || error);
    if (error.stack) {
      console.error(error.stack);
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

