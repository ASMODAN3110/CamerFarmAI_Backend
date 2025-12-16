// src/fakers/config/scenarios.config.ts
/**
 * Configuration des scénarios de test et distribution des fakers
 */

export type ScenarioType = 'normal' | 'edge' | 'alert' | 'seasonal' | 'mixed';

export interface EntityDistribution {
  SensorReading: number;
  Sensor: number;
  User: number;
  Plantation: number;
  Event: number;
  Notification: number;
  Actuator: number;
}

/**
 * Distribution pondérée par défaut pour 1000 fakers
 */
export const DEFAULT_DISTRIBUTION: EntityDistribution = {
  SensorReading: 500,  // 50% - données de capteurs pour tests de visualisation et analytics
  Sensor: 150,         // 15% - capteurs pour différentes plantations
  User: 100,           // 10% - utilisateurs avec différents rôles
  Plantation: 100,     // 10% - plantations variées
  Event: 80,           // 8% - événements pour tests de notifications
  Notification: 50,    // 5% - notifications variées
  Actuator: 20,        // 2% - actionneurs
};

/**
 * Calcule la distribution réelle basée sur le total souhaité
 */
export function calculateDistribution(total: number, customDistribution?: Partial<EntityDistribution>): EntityDistribution {
  const distribution = customDistribution || DEFAULT_DISTRIBUTION;
  const totalDefault = Object.values(DEFAULT_DISTRIBUTION).reduce((sum, val) => sum + val, 0);
  const ratio = total / totalDefault;

  return {
    SensorReading: Math.round(distribution.SensorReading * ratio),
    Sensor: Math.round(distribution.Sensor * ratio),
    User: Math.round((distribution.User || DEFAULT_DISTRIBUTION.User) * ratio),
    Plantation: Math.round((distribution.Plantation || DEFAULT_DISTRIBUTION.Plantation) * ratio),
    Event: Math.round((distribution.Event || DEFAULT_DISTRIBUTION.Event) * ratio),
    Notification: Math.round((distribution.Notification || DEFAULT_DISTRIBUTION.Notification) * ratio),
    Actuator: Math.round((distribution.Actuator || DEFAULT_DISTRIBUTION.Actuator) * ratio),
  };
}

/**
 * Configuration des scénarios
 */
export interface ScenarioConfig {
  name: string;
  description: string;
  weights: {
    normal: number;
    edge: number;
    alert: number;
    seasonal: number;
  };
}

export const SCENARIO_CONFIGS: Record<ScenarioType, ScenarioConfig> = {
  normal: {
    name: 'Normal',
    description: 'Toutes les valeurs dans les plages normales',
    weights: {
      normal: 1.0,
      edge: 0,
      alert: 0,
      seasonal: 0,
    },
  },
  edge: {
    name: 'Edge Cases',
    description: 'Valeurs aux limites (min/max) pour tester la robustesse',
    weights: {
      normal: 0,
      edge: 1.0,
      alert: 0,
      seasonal: 0,
    },
  },
  alert: {
    name: 'Alertes',
    description: 'Valeurs dépassant les seuils pour générer des événements d\'alerte',
    weights: {
      normal: 0.2,
      edge: 0.1,
      alert: 0.7,
      seasonal: 0,
    },
  },
  seasonal: {
    name: 'Saisonnier',
    description: 'Données pour les 4 situations saisonnières',
    weights: {
      normal: 0.3,
      edge: 0.1,
      alert: 0.1,
      seasonal: 0.5,
    },
  },
  mixed: {
    name: 'Mixte',
    description: 'Mélange de tous les scénarios',
    weights: {
      normal: 0.5,
      edge: 0.2,
      alert: 0.2,
      seasonal: 0.1,
    },
  },
};

/**
 * Obtient la configuration d'un scénario
 */
export function getScenarioConfig(scenario: ScenarioType): ScenarioConfig {
  return SCENARIO_CONFIGS[scenario];
}

/**
 * Sélectionne un sous-scénario basé sur les poids
 */
export function selectSubScenario(scenario: ScenarioType): 'normal' | 'edge' | 'alert' | 'seasonal' {
  const config = getScenarioConfig(scenario);
  const weights = config.weights;
  const total = weights.normal + weights.edge + weights.alert + weights.seasonal;
  const random = Math.random() * total;

  if (random < weights.normal) return 'normal';
  if (random < weights.normal + weights.edge) return 'edge';
  if (random < weights.normal + weights.edge + weights.alert) return 'alert';
  return 'seasonal';
}

