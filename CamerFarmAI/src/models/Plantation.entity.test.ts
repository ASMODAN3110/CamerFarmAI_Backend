// src/models/Plantation.entity.test.ts
import { Plantation } from './Plantation.entity';
import { SensorStatus } from './Sensor.entity';
import { ActuatorStatus } from './Actuator.entity';

describe('Plantation.getEtat', () => {
  // Helper pour créer une plantation avec des capteurs et actionneurs
  const createPlantation = (sensors: any[] = [], actuators: any[] = []): Plantation => {
    const plantation = Object.create(Plantation.prototype);
    Object.assign(plantation, {
      id: 'plantation-id-123',
      name: 'Test Plantation',
      location: 'Test Location',
      cropType: 'maïs',
      sensors,
      actuators,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return plantation as Plantation;
  };

  // Helper pour créer un capteur
  const createSensor = (status: 'active' | 'inactive', id: string = 'sensor-id') => ({
    id,
    type: 'temperature',
    status,
    plantationId: 'plantation-id-123',
  });

  // Helper pour créer un actionneur
  const createActuator = (status: 'active' | 'inactive', id: string = 'actuator-id') => ({
    id,
    name: 'Test Actuator',
    type: 'irrigation',
    status,
    plantationId: 'plantation-id-123',
  });

  describe('État unknown - Aucun capteur ni actionneur', () => {
    it('devrait retourner unknown si aucun capteur et aucun actionneur', () => {
      const plantation = createPlantation([], []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('unknown');
      expect(etat.message).toBe('Aucun capteur ou actionneur configuré');
      expect(etat.activeSensors).toBe(0);
      expect(etat.totalSensors).toBe(0);
      expect(etat.activeActuators).toBe(0);
      expect(etat.totalActuators).toBe(0);
    });

    it('devrait retourner unknown si sensors et actuators sont undefined', () => {
      const plantation = createPlantation(undefined as any, undefined as any);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('unknown');
      expect(etat.message).toBe('Aucun capteur ou actionneur configuré');
      expect(etat.activeSensors).toBe(0);
      expect(etat.totalSensors).toBe(0);
      expect(etat.activeActuators).toBe(0);
      expect(etat.totalActuators).toBe(0);
    });

    it('devrait retourner unknown si sensors et actuators sont null', () => {
      const plantation = createPlantation(null as any, null as any);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('unknown');
      expect(etat.message).toBe('Aucun capteur ou actionneur configuré');
    });
  });

  describe('État critical - Aucun capteur actif', () => {
    it('devrait retourner critical si aucun capteur actif mais des capteurs existent', () => {
      const sensors = [
        createSensor('inactive', 'sensor-1'),
        createSensor('inactive', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('critical');
      expect(etat.message).toBe('Aucun capteur actif');
      expect(etat.activeSensors).toBe(0);
      expect(etat.totalSensors).toBe(3);
    });

    it('devrait retourner critical même avec des actionneurs actifs', () => {
      const sensors = [
        createSensor('inactive', 'sensor-1'),
        createSensor('inactive', 'sensor-2'),
      ];
      const actuators = [
        createActuator('active', 'actuator-1'),
        createActuator('active', 'actuator-2'),
      ];
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('critical');
      expect(etat.message).toBe('Aucun capteur actif');
      expect(etat.activeSensors).toBe(0);
      expect(etat.totalSensors).toBe(2);
      expect(etat.activeActuators).toBe(2);
      expect(etat.totalActuators).toBe(2);
    });

    it('devrait retourner critical avec un seul capteur inactif', () => {
      const sensors = [createSensor('inactive', 'sensor-1')];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('critical');
      expect(etat.message).toBe('Aucun capteur actif');
      expect(etat.activeSensors).toBe(0);
      expect(etat.totalSensors).toBe(1);
    });
  });

  describe('État warning - Moins de 50% des capteurs actifs', () => {
    it('devrait retourner warning si exactement 49% des capteurs sont actifs (arrondi)', () => {
      // 2 actifs sur 5 = 40% < 50%
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
        createSensor('inactive', 'sensor-5'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('warning');
      expect(etat.message).toBe('Moins de la moitié des capteurs sont actifs');
      expect(etat.activeSensors).toBe(2);
      expect(etat.totalSensors).toBe(5);
    });

    it('devrait retourner warning si 1 capteur actif sur 3 (33%)', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('inactive', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('warning');
      expect(etat.message).toBe('Moins de la moitié des capteurs sont actifs');
      expect(etat.activeSensors).toBe(1);
      expect(etat.totalSensors).toBe(3);
    });

    it('devrait retourner warning si 1 capteur actif sur 4 (25%)', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('inactive', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('warning');
      expect(etat.message).toBe('Moins de la moitié des capteurs sont actifs');
      expect(etat.activeSensors).toBe(1);
      expect(etat.totalSensors).toBe(4);
    });

    it('devrait retourner warning si 2 capteurs actifs sur 5 (40%)', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
        createSensor('inactive', 'sensor-5'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('warning');
      expect(etat.message).toBe('Moins de la moitié des capteurs sont actifs');
    });
  });

  describe('État healthy - 50% ou plus des capteurs actifs', () => {
    it('devrait retourner healthy si exactement 50% des capteurs sont actifs', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('healthy');
      expect(etat.message).toBe('Tous les systèmes fonctionnent normalement');
      expect(etat.activeSensors).toBe(2);
      expect(etat.totalSensors).toBe(4);
    });

    it('devrait retourner healthy si plus de 50% des capteurs sont actifs', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('active', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('healthy');
      expect(etat.message).toBe('Tous les systèmes fonctionnent normalement');
      expect(etat.activeSensors).toBe(3);
      expect(etat.totalSensors).toBe(4);
    });

    it('devrait retourner healthy si tous les capteurs sont actifs', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('active', 'sensor-3'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('healthy');
      expect(etat.message).toBe('Tous les systèmes fonctionnent normalement');
      expect(etat.activeSensors).toBe(3);
      expect(etat.totalSensors).toBe(3);
    });

    it('devrait retourner healthy avec un seul capteur actif', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('healthy');
      expect(etat.message).toBe('Tous les systèmes fonctionnent normalement');
      expect(etat.activeSensors).toBe(1);
      expect(etat.totalSensors).toBe(1);
    });

    it('devrait retourner healthy si 3 capteurs actifs sur 4 (75%)', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('active', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('healthy');
      expect(etat.message).toBe('Tous les systèmes fonctionnent normalement');
    });
  });

  describe('Comptage des actionneurs', () => {
    it('devrait compter correctement les actionneurs actifs et inactifs', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const actuators = [
        createActuator('active', 'actuator-1'),
        createActuator('active', 'actuator-2'),
        createActuator('inactive', 'actuator-3'),
      ];
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      expect(etat.activeActuators).toBe(2);
      expect(etat.totalActuators).toBe(3);
    });

    it('devrait compter 0 actionneurs actifs si tous sont inactifs', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const actuators = [
        createActuator('inactive', 'actuator-1'),
        createActuator('inactive', 'actuator-2'),
      ];
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      expect(etat.activeActuators).toBe(0);
      expect(etat.totalActuators).toBe(2);
    });

    it('devrait compter tous les actionneurs actifs', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const actuators = [
        createActuator('active', 'actuator-1'),
        createActuator('active', 'actuator-2'),
        createActuator('active', 'actuator-3'),
      ];
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      expect(etat.activeActuators).toBe(3);
      expect(etat.totalActuators).toBe(3);
    });

    it('devrait gérer le cas sans actionneurs', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.activeActuators).toBe(0);
      expect(etat.totalActuators).toBe(0);
    });
  });

  describe('Comptage des capteurs', () => {
    it('devrait compter correctement les capteurs actifs et inactifs', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.activeSensors).toBe(2);
      expect(etat.totalSensors).toBe(4);
    });

    it('devrait compter 0 capteurs actifs si tous sont inactifs', () => {
      const sensors = [
        createSensor('inactive', 'sensor-1'),
        createSensor('inactive', 'sensor-2'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.activeSensors).toBe(0);
      expect(etat.totalSensors).toBe(2);
    });

    it('devrait compter tous les capteurs actifs', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('active', 'sensor-3'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.activeSensors).toBe(3);
      expect(etat.totalSensors).toBe(3);
    });
  });

  describe('Cas limites et valeurs frontières', () => {
    it('devrait gérer le cas avec 0 capteurs mais des actionneurs', () => {
      const actuators = [createActuator('active', 'actuator-1')];
      const plantation = createPlantation([], actuators);

      const etat = plantation.getEtat();

      // Si aucun capteur mais des actionneurs, la logique actuelle retourne 'healthy'
      // car aucune condition n'est vraie (totalSensors === 0, donc activeSensors < totalSensors * 0.5 est false)
      expect(etat.status).toBe('healthy');
      expect(etat.message).toBe('Tous les systèmes fonctionnent normalement');
      expect(etat.totalSensors).toBe(0);
      expect(etat.totalActuators).toBe(1);
    });

    it('devrait gérer le cas avec des capteurs mais 0 actionneurs', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.status).toBe('healthy');
      expect(etat.totalSensors).toBe(1);
      expect(etat.totalActuators).toBe(0);
    });

    it('devrait gérer le cas limite : 1 capteur actif sur 2 (50%)', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('inactive', 'sensor-2'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      // 1 actif sur 2 = 50%, donc healthy
      expect(etat.status).toBe('healthy');
      expect(etat.activeSensors).toBe(1);
      expect(etat.totalSensors).toBe(2);
    });

    it('devrait gérer le cas limite : 2 capteurs actifs sur 5 (40%)', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
        createSensor('inactive', 'sensor-5'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      // 2 actifs sur 5 = 40% < 50%, donc warning
      expect(etat.status).toBe('warning');
      expect(etat.activeSensors).toBe(2);
      expect(etat.totalSensors).toBe(5);
    });

    it('devrait gérer le cas limite : 3 capteurs actifs sur 5 (60%)', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('active', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
        createSensor('inactive', 'sensor-5'),
      ];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      // 3 actifs sur 5 = 60% >= 50%, donc healthy
      expect(etat.status).toBe('healthy');
      expect(etat.activeSensors).toBe(3);
      expect(etat.totalSensors).toBe(5);
    });
  });

  describe('Structure de retour', () => {
    it('devrait retourner un objet avec toutes les propriétés requises', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const actuators = [createActuator('active', 'actuator-1')];
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      expect(etat).toHaveProperty('status');
      expect(etat).toHaveProperty('activeSensors');
      expect(etat).toHaveProperty('totalSensors');
      expect(etat).toHaveProperty('activeActuators');
      expect(etat).toHaveProperty('totalActuators');
      expect(etat).toHaveProperty('message');
    });

    it('devrait retourner un statut valide', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(['healthy', 'warning', 'critical', 'unknown']).toContain(etat.status);
    });

    it('devrait retourner un message non vide', () => {
      const sensors = [createSensor('active', 'sensor-1')];
      const plantation = createPlantation(sensors, []);

      const etat = plantation.getEtat();

      expect(etat.message).toBeTruthy();
      expect(typeof etat.message).toBe('string');
      expect(etat.message.length).toBeGreaterThan(0);
    });

    it('devrait retourner des nombres pour les compteurs', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('inactive', 'sensor-2'),
      ];
      const actuators = [createActuator('active', 'actuator-1')];
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      expect(typeof etat.activeSensors).toBe('number');
      expect(typeof etat.totalSensors).toBe('number');
      expect(typeof etat.activeActuators).toBe('number');
      expect(typeof etat.totalActuators).toBe('number');
    });
  });

  describe('Scénarios complexes', () => {
    it('devrait gérer un grand nombre de capteurs et actionneurs', () => {
      const sensors = Array.from({ length: 20 }, (_, i) =>
        createSensor(i < 12 ? 'active' : 'inactive', `sensor-${i}`)
      );
      const actuators = Array.from({ length: 10 }, (_, i) =>
        createActuator(i < 7 ? 'active' : 'inactive', `actuator-${i}`)
      );
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      // 12 actifs sur 20 = 60% >= 50%, donc healthy
      expect(etat.status).toBe('healthy');
      expect(etat.activeSensors).toBe(12);
      expect(etat.totalSensors).toBe(20);
      expect(etat.activeActuators).toBe(7);
      expect(etat.totalActuators).toBe(10);
    });

    it('devrait gérer un mélange complexe de capteurs et actionneurs', () => {
      const sensors = [
        createSensor('active', 'sensor-1'),
        createSensor('active', 'sensor-2'),
        createSensor('inactive', 'sensor-3'),
        createSensor('inactive', 'sensor-4'),
        createSensor('inactive', 'sensor-5'),
      ];
      const actuators = [
        createActuator('active', 'actuator-1'),
        createActuator('inactive', 'actuator-2'),
        createActuator('inactive', 'actuator-3'),
      ];
      const plantation = createPlantation(sensors, actuators);

      const etat = plantation.getEtat();

      // 2 actifs sur 5 = 40% < 50%, donc warning
      expect(etat.status).toBe('warning');
      expect(etat.activeSensors).toBe(2);
      expect(etat.totalSensors).toBe(5);
      expect(etat.activeActuators).toBe(1);
      expect(etat.totalActuators).toBe(3);
    });
  });
});
