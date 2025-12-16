// src/scripts/test-fakers.ts
/**
 * Script de test pour vérifier que tous les fakers fonctionnent correctement
 */

import { UserFactory } from '../fakers/factories/user.factory';
import { PlantationFactory } from '../fakers/factories/plantation.factory';
import { SensorFactory } from '../fakers/factories/sensor.factory';
import { SensorReadingFactory } from '../fakers/factories/sensor-reading.factory';
import { ActuatorFactory } from '../fakers/factories/actuator.factory';
import { EventFactory } from '../fakers/factories/event.factory';
import { NotificationFactory } from '../fakers/factories/notification.factory';
import { SensorType } from '../models/Sensor.entity';
import { UserRole } from '../models/User.entity';
import { PlantationMode } from '../models/Plantation.entity';
import { EventType } from '../models/Event.entity';
import { NotificationCanal } from '../models/Notification.entity';
import { ActuatorStatus } from '../models/Actuator.entity';
import { createCompleteTestData } from '../fakers/helpers/test-helpers';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function logTest(name: string, testFn: () => Promise<void> | void): void | Promise<void> {
  try {
    const result = testFn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          results.push({ name, success: true });
          console.log(`✓ ${name}`);
        })
        .catch((error) => {
          results.push({ name, success: false, error: error.message });
          console.error(`✗ ${name}: ${error.message}`);
        });
    } else {
      results.push({ name, success: true });
      console.log(`✓ ${name}`);
      return;
    }
  } catch (error: any) {
    results.push({ name, success: false, error: error.message });
    console.error(`✗ ${name}: ${error.message}`);
    return;
  }
}

async function testUserFactory() {
  console.log('\n📋 Test UserFactory...');
  
  logTest('Créer un utilisateur farmer', async () => {
    const user = await UserFactory.createFarmer();
    if (!user.phone || !user.role || user.role !== UserRole.FARMER) {
      throw new Error('Utilisateur farmer invalide');
    }
  });

  logTest('Créer un utilisateur technician', async () => {
    const user = await UserFactory.createTechnician();
    if (!user.phone || user.role !== UserRole.TECHNICIAN) {
      throw new Error('Utilisateur technician invalide');
    }
  });

  logTest('Créer un utilisateur admin', async () => {
    const user = await UserFactory.createAdmin();
    if (!user.phone || user.role !== UserRole.ADMIN) {
      throw new Error('Utilisateur admin invalide');
    }
  });

  logTest('Créer un utilisateur avec 2FA', async () => {
    const user = await UserFactory.createWith2FA();
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new Error('2FA non activé');
    }
  });

  logTest('Créer un batch d\'utilisateurs', async () => {
    const users = await UserFactory.createBatch(5);
    if (users.length !== 5) {
      throw new Error(`Attendu 5 utilisateurs, obtenu ${users.length}`);
    }
  });
}

async function testPlantationFactory() {
  console.log('\n📋 Test PlantationFactory...');
  
  const testUserId = 'test-user-id-123';

  logTest('Créer une plantation', () => {
    const plantation = PlantationFactory.create({ ownerId: testUserId });
    if (!plantation.name || !plantation.cropType || !plantation.location) {
      throw new Error('Plantation invalide');
    }
  });

  logTest('Créer une plantation automatique', () => {
    const plantation = PlantationFactory.createAutomatic({ ownerId: testUserId });
    if (plantation.mode !== PlantationMode.AUTOMATIC) {
      throw new Error('Mode automatique non défini');
    }
  });

  logTest('Créer une plantation manuelle', () => {
    const plantation = PlantationFactory.createManual({ ownerId: testUserId });
    if (plantation.mode !== PlantationMode.MANUAL) {
      throw new Error('Mode manuel non défini');
    }
  });

  logTest('Créer un batch de plantations', () => {
    const plantations = PlantationFactory.createBatch(testUserId, 3);
    if (plantations.length !== 3) {
      throw new Error(`Attendu 3 plantations, obtenu ${plantations.length}`);
    }
  });
}

function testSensorFactory() {
  console.log('\n📋 Test SensorFactory...');
  
  const testPlantationId = 'test-plantation-id-123';

  logTest('Créer un capteur avec seuils', () => {
    const sensor = SensorFactory.createWithThresholds({
      plantationId: testPlantationId,
      type: SensorType.TEMPERATURE,
    });
    if (!sensor.seuilMin || !sensor.seuilMax || sensor.seuilMin >= sensor.seuilMax) {
      throw new Error('Seuils invalides');
    }
  });

  logTest('Créer un capteur simple', () => {
    const sensor = SensorFactory.createSimple(testPlantationId, SensorType.SOIL_MOISTURE);
    if (!sensor.type || sensor.type !== SensorType.SOIL_MOISTURE) {
      throw new Error('Type de capteur invalide');
    }
  });

  logTest('Créer un batch de capteurs', () => {
    const sensors = SensorFactory.createBatch(testPlantationId);
    if (sensors.length === 0) {
      throw new Error('Aucun capteur créé');
    }
  });
}

function testSensorReadingFactory() {
  console.log('\n📋 Test SensorReadingFactory...');
  
  const testSensorId = 'test-sensor-id-123';

  logTest('Générer une lecture unique', () => {
    const reading = SensorReadingFactory.generate(SensorType.TEMPERATURE);
    if (!reading.value || !reading.timestamp) {
      throw new Error('Lecture invalide');
    }
  });

  logTest('Générer une série de lectures', () => {
    const readings = SensorReadingFactory.generateSeries(SensorType.TEMPERATURE, 'transition', {
      count: 10,
      hours: 10,
      sensorId: testSensorId,
    });
    if (readings.length !== 10) {
      throw new Error(`Attendu 10 lectures, obtenu ${readings.length}`);
    }
  });

  logTest('Générer pour saison sèche', () => {
    const readings = SensorReadingFactory.generateForDrySeason(SensorType.SOIL_MOISTURE, {
      count: 5,
      sensorId: testSensorId,
    });
    if (!Array.isArray(readings) || readings.length !== 5) {
      throw new Error('Lectures saison sèche invalides');
    }
  });

  logTest('Générer pour saison des pluies', () => {
    const readings = SensorReadingFactory.generateForRainySeason(SensorType.SOIL_MOISTURE, {
      count: 5,
      sensorId: testSensorId,
    });
    if (!Array.isArray(readings) || readings.length !== 5) {
      throw new Error('Lectures saison pluie invalides');
    }
  });
}

function testActuatorFactory() {
  console.log('\n📋 Test ActuatorFactory...');
  
  const testPlantationId = 'test-plantation-id-123';

  logTest('Créer un actionneur', () => {
    const actuator = ActuatorFactory.create({ plantationId: testPlantationId });
    if (!actuator.name || !actuator.type) {
      throw new Error('Actionneur invalide');
    }
  });

  logTest('Créer un actionneur actif', () => {
    const actuator = ActuatorFactory.createActive({ plantationId: testPlantationId });
    if (actuator.status !== ActuatorStatus.ACTIVE) {
      throw new Error('Statut actif non défini');
    }
  });

  logTest('Créer un actionneur inactif', () => {
    const actuator = ActuatorFactory.createInactive({ plantationId: testPlantationId });
    if (actuator.status !== ActuatorStatus.INACTIVE) {
      throw new Error('Statut inactif non défini');
    }
  });

  logTest('Créer un ensemble par défaut', () => {
    const actuators = ActuatorFactory.createDefaultSet(testPlantationId);
    if (actuators.length !== 3) {
      throw new Error(`Attendu 3 actionneurs, obtenu ${actuators.length}`);
    }
  });
}

function testEventFactory() {
  console.log('\n📋 Test EventFactory...');
  
  const testSensorId = 'test-sensor-id-123';
  const testActuatorId = 'test-actuator-id-123';

  logTest('Créer un événement', () => {
    const event = EventFactory.create();
    if (!event.type || !event.description) {
      throw new Error('Événement invalide');
    }
  });

  logTest('Créer un événement de seuil dépassé', () => {
    const event = EventFactory.createThresholdExceeded(testSensorId, SensorType.TEMPERATURE);
    if (event.type !== EventType.SEUIL_DEPASSE || !event.sensorId) {
      throw new Error('Événement seuil invalide');
    }
  });

  logTest('Créer un événement d\'actionneur activé', () => {
    const event = EventFactory.createActuatorActivated(testActuatorId, 'Pompe test');
    if (event.type !== EventType.ACTIONNEUR_ACTIVE || !event.actuatorId) {
      throw new Error('Événement activation invalide');
    }
  });

  logTest('Créer un événement de changement de mode', () => {
    const event = EventFactory.createModeChanged();
    if (event.type !== EventType.MODE_CHANGED) {
      throw new Error('Événement changement de mode invalide');
    }
  });
}

function testNotificationFactory() {
  console.log('\n📋 Test NotificationFactory...');
  
  const testEventId = 'test-event-id-123';
  const testUserId = 'test-user-id-123';

  logTest('Créer une notification', () => {
    const notification = NotificationFactory.create({
      eventId: testEventId,
      userId: testUserId,
    });
    if (!notification.canal || !notification.statut) {
      throw new Error('Notification invalide');
    }
  });

  logTest('Créer une notification web', () => {
    const notification = NotificationFactory.createWeb({
      eventId: testEventId,
      userId: testUserId,
    });
    if (notification.canal !== NotificationCanal.WEB) {
      throw new Error('Canal web non défini');
    }
  });

  logTest('Créer une notification email', () => {
    const notification = NotificationFactory.createEmail({
      eventId: testEventId,
      userId: testUserId,
    });
    if (notification.canal !== NotificationCanal.EMAIL) {
      throw new Error('Canal email non défini');
    }
  });

  logTest('Créer une notification lue', () => {
    const notification = NotificationFactory.createRead({
      eventId: testEventId,
      userId: testUserId,
    });
    if (!notification.isRead) {
      throw new Error('Notification non marquée comme lue');
    }
  });
}

async function testCompleteData() {
  console.log('\n📋 Test createCompleteTestData...');
  
  logTest('Créer des données complètes', async () => {
    const data = await createCompleteTestData({
      readingsPerSensor: 5,
      sensorsPerPlantation: 3,
      actuatorsPerPlantation: 2,
      eventsCount: 3,
      notificationsPerEvent: 1,
    });
    
    if (!data.user || !data.plantation) {
      throw new Error('User ou Plantation manquant');
    }
    if (data.sensors.length === 0) {
      throw new Error('Aucun capteur créé');
    }
    if (data.readings.length === 0) {
      throw new Error('Aucune lecture créée');
    }
    if (data.actuators.length === 0) {
      throw new Error('Aucun actionneur créé');
    }
    if (data.events.length === 0) {
      throw new Error('Aucun événement créé');
    }
    if (data.notifications.length === 0) {
      throw new Error('Aucune notification créée');
    }
  });
}

function testCameroonData() {
  console.log('\n📋 Test Cameroon Data...');
  
  const { generateCameroonPhoneNumber, getRandomCameroonLocation, getRandomCameroonCrop } = require('../fakers/helpers/cameroon-data');

  logTest('Générer un numéro de téléphone camerounais', () => {
    const phone = generateCameroonPhoneNumber();
    if (!phone || phone.length < 9) {
      throw new Error('Numéro de téléphone invalide');
    }
  });

  logTest('Obtenir une localisation camerounaise', () => {
    const location = getRandomCameroonLocation();
    if (!location.name || !location.region || !location.coordinates) {
      throw new Error('Localisation invalide');
    }
  });

  logTest('Obtenir une culture camerounaise', () => {
    const crop = getRandomCameroonCrop();
    if (!crop || crop.length === 0) {
      throw new Error('Culture invalide');
    }
  });
}

async function main() {
  console.log('🧪 Test de tous les fakers du projet\n');
  console.log('=' .repeat(50));

  try {
    await testUserFactory();
    testPlantationFactory();
    testSensorFactory();
    testSensorReadingFactory();
    testActuatorFactory();
    testEventFactory();
    testNotificationFactory();
    await testCompleteData();
    testCameroonData();

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Résumé des tests:\n');

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✓ Réussis: ${successCount}`);
    console.log(`✗ Échoués: ${failCount}`);
    console.log(`📊 Total: ${results.length}`);

    if (failCount > 0) {
      console.log('\n❌ Tests échoués:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
      process.exit(1);
    } else {
      console.log('\n✅ Tous les tests sont passés avec succès!');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Exécuter les tests
if (require.main === module) {
  main();
}

