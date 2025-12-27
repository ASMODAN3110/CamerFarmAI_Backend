# Documentation Frontend - Gestion Automatique des Statuts des Capteurs

## Vue d'ensemble

Le système gère automatiquement les statuts **ACTIVE** et **INACTIVE** des capteurs basés sur leur activité :

- ✅ **ACTIVE** : Le capteur a envoyé une valeur dans la dernière heure
- ⚠️ **INACTIVE** : Le capteur n'a pas envoyé de valeur depuis plus d'1 heure

**Important** : La mise à jour des statuts se fait automatiquement côté backend lors de la consultation des capteurs. Le frontend n'a pas besoin d'appeler un endpoint spécifique pour mettre à jour les statuts.

---

## Endpoints concernés

### 1. `GET /api/plantations/:id`
**Récupère une plantation avec ses capteurs**

- ✅ **Mise à jour automatique** : Les statuts des capteurs sont automatiquement mis à jour avant la réponse
- Les capteurs inactifs (sans lecture depuis 1h) sont marqués comme `INACTIVE`
- Les capteurs actifs (avec lecture récente) sont marqués comme `ACTIVE`

**Exemple de réponse :**
```json
{
  "id": "uuid-plantation",
  "name": "Champ Nord",
  "sensors": [
    {
      "id": "uuid-sensor-1",
      "type": "temperature",
      "status": "active",  // ← Statut automatiquement mis à jour
      "seuilMin": 20,
      "seuilMax": 30,
      "plantationId": "uuid-plantation",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid-sensor-2",
      "type": "soilMoisture",
      "status": "inactive",  // ← Capteur inactif (pas de lecture depuis 1h)
      "seuilMin": 40,
      "seuilMax": 80,
      "plantationId": "uuid-plantation",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "latestReadings": [
    {
      "sensorId": "uuid-sensor-1",
      "sensorType": "temperature",
      "latestReading": {
        "value": 25.5,
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    },
    {
      "sensorId": "uuid-sensor-2",
      "sensorType": "soilMoisture",
      "latestReading": null  // ← Pas de lecture récente
    }
  ]
}
```

---

### 2. `GET /api/plantations/:id/sensors`
**Récupère tous les capteurs d'une plantation**

- ✅ **Mise à jour automatique** : Les statuts sont automatiquement mis à jour avant la réponse

**Exemple de réponse :**
```json
[
  {
    "id": "uuid-sensor-1",
    "type": "temperature",
    "status": "active",
    "seuilMin": 20,
    "seuilMax": 30,
    "plantationId": "uuid-plantation",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid-sensor-2",
    "type": "soilMoisture",
    "status": "inactive",
    "seuilMin": 40,
    "seuilMax": 80,
    "plantationId": "uuid-plantation",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 3. `POST /api/plantations/:id/sensors/:sensorId/readings`
**Ajoute une nouvelle lecture de capteur**

- ✅ **Activation automatique** : Si le capteur était `INACTIVE`, il devient automatiquement `ACTIVE` après l'ajout de la lecture
- ❌ **Plus de restriction** : Il est maintenant possible d'ajouter une lecture même si le capteur est inactif (il sera réactivé automatiquement)

**Corps de la requête :**
```json
{
  "value": 25.5
}
```

**Exemple de réponse :**
```json
{
  "id": "uuid-reading",
  "value": 25.5,
  "sensorId": "uuid-sensor-1",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Comportement :**
- Si le capteur était `INACTIVE`, il devient `ACTIVE` automatiquement
- Si le capteur était déjà `ACTIVE`, il reste `ACTIVE`

---

## Types et Enums

### SensorStatus
```typescript
enum SensorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
```

### SensorType
```typescript
enum SensorType {
  TEMPERATURE = 'temperature',
  SOIL_MOISTURE = 'soilMoisture',
  CO2_LEVEL = 'co2Level',
  WATER_LEVEL = 'waterLevel',
  LUMINOSITY = 'luminosity'
}
```

### Structure Sensor
```typescript
interface Sensor {
  id: string;                    // UUID
  type: SensorType;              // Type du capteur
  status: SensorStatus;          // 'active' | 'inactive'
  seuilMin?: number;             // Seuil minimum (optionnel)
  seuilMax?: number;             // Seuil maximum (optionnel)
  plantationId: string;          // UUID de la plantation
  createdAt: string;             // ISO 8601 date
  updatedAt: string;             // ISO 8601 date
}
```

---

## Logique métier

### Règle d'activation/désactivation

1. **Activation automatique** :
   - Quand un capteur envoie une nouvelle valeur via `POST /readings`
   - Le capteur passe automatiquement à `ACTIVE` (même s'il était `INACTIVE`)

2. **Désactivation automatique** :
   - Un capteur devient `INACTIVE` s'il n'a pas reçu de nouvelle lecture depuis **1 heure**
   - La vérification se fait automatiquement lors des appels à :
     - `GET /api/plantations/:id`
     - `GET /api/plantations/:id/sensors`

3. **Capteurs sans lecture** :
   - Un capteur qui n'a jamais reçu de lecture reste `ACTIVE` par défaut
   - Il ne sera marqué `INACTIVE` qu'après avoir reçu au moins une lecture puis être resté silencieux pendant 1h

### Seuil de temps

- **Durée d'inactivité** : 1 heure (3600 secondes)
- **Calcul** : `NOW() - dernière_lecture.timestamp > 1 heure` → `INACTIVE`

---

## Recommandations pour le frontend

### 1. Affichage visuel des statuts

```typescript
// Exemple de fonction utilitaire
function getSensorStatusColor(status: SensorStatus): string {
  switch (status) {
    case 'active':
      return '#10b981'; // Vert
    case 'inactive':
      return '#ef4444'; // Rouge
    default:
      return '#6b7280'; // Gris
  }
}

function getSensorStatusLabel(status: SensorStatus): string {
  switch (status) {
    case 'active':
      return 'Actif';
    case 'inactive':
      return 'Inactif';
    default:
      return 'Inconnu';
  }
}
```

### 2. Indicateurs visuels recommandés

- **Badge/indicateur** : Afficher un badge coloré à côté de chaque capteur
- **Icône** : Utiliser une icône différente (✓ pour actif, ⚠ pour inactif)
- **Dernière lecture** : Afficher le temps écoulé depuis la dernière lecture
- **Alerte** : Afficher une alerte si un capteur est inactif

### 3. Rafraîchissement des données

```typescript
// Exemple : Rafraîchir les statuts toutes les 5 minutes
useEffect(() => {
  const interval = setInterval(() => {
    fetchPlantation(plantationId); // Les statuts seront mis à jour automatiquement
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, [plantationId]);
```

### 4. Gestion des capteurs inactifs

```typescript
// Exemple : Filtrer ou mettre en évidence les capteurs inactifs
const activeSensors = sensors.filter(s => s.status === 'active');
const inactiveSensors = sensors.filter(s => s.status === 'inactive');

// Afficher un message si des capteurs sont inactifs
if (inactiveSensors.length > 0) {
  console.warn(`${inactiveSensors.length} capteur(s) inactif(s)`);
}
```

### 5. Affichage de la dernière lecture

```typescript
// Utiliser latestReadings pour afficher la dernière valeur
function getTimeSinceLastReading(latestReading: { timestamp: string } | null): string {
  if (!latestReading) return 'Jamais';
  
  const now = new Date();
  const lastReading = new Date(latestReading.timestamp);
  const diffMs = now.getTime() - lastReading.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} minute(s)`;
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    return `Il y a ${diffHours} heure(s)`;
  }
}
```

---

## Exemples d'utilisation

### Exemple 1 : Afficher la liste des capteurs avec leur statut

```typescript
// React component example
function SensorList({ plantationId }: { plantationId: string }) {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  
  useEffect(() => {
    fetch(`/api/plantations/${plantationId}/sensors`)
      .then(res => res.json())
      .then(data => setSensors(data));
  }, [plantationId]);
  
  return (
    <div>
      {sensors.map(sensor => (
        <div key={sensor.id} className="sensor-card">
          <h3>{sensor.type}</h3>
          <span className={`status-badge status-${sensor.status}`}>
            {sensor.status === 'active' ? '✓ Actif' : '⚠ Inactif'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Exemple 2 : Envoyer une lecture et mettre à jour l'affichage

```typescript
async function sendSensorReading(
  plantationId: string,
  sensorId: string,
  value: number
) {
  const response = await fetch(
    `/api/plantations/${plantationId}/sensors/${sensorId}/readings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    }
  );
  
  if (response.ok) {
    // Le capteur est maintenant automatiquement ACTIVE
    // Rafraîchir la liste des capteurs pour voir le nouveau statut
    refreshSensors();
  }
}
```

---

## Cas d'usage

### Cas 1 : Capteur qui reprend l'envoi de données
1. Capteur est `INACTIVE` (pas de lecture depuis 1h)
2. Frontend envoie une nouvelle lecture via `POST /readings`
3. Backend active automatiquement le capteur → `ACTIVE`
4. Frontend peut rafraîchir la liste pour voir le nouveau statut

### Cas 2 : Capteur qui cesse d'envoyer des données
1. Capteur est `ACTIVE` (dernière lecture il y a 30 minutes)
2. Le capteur cesse d'envoyer des données
3. Frontend appelle `GET /api/plantations/:id` après 1h30
4. Backend détecte que la dernière lecture date de plus d'1h
5. Backend met à jour le statut → `INACTIVE`
6. Frontend reçoit le capteur avec `status: 'inactive'`

### Cas 3 : Consultation régulière
1. Frontend rafraîchit la liste des capteurs toutes les 5 minutes
2. À chaque appel, le backend met à jour automatiquement les statuts
3. Le frontend affiche toujours les statuts à jour

---

## Notes importantes

1. **Pas d'endpoint dédié** : Il n'y a pas d'endpoint spécifique pour mettre à jour les statuts. La mise à jour est automatique.

2. **Performance** : La mise à jour des statuts est optimisée et ne ralentit pas significativement les requêtes.

3. **Cohérence** : Les statuts sont toujours cohérents car ils sont recalculés à chaque consultation.

4. **Pas de polling nécessaire** : Le frontend n'a pas besoin de vérifier périodiquement les statuts. Il suffit de rafraîchir les données lors de la consultation normale.

5. **Temps réel** : Pour un affichage en temps réel, le frontend peut :
   - Utiliser WebSockets (si implémenté)
   - Rafraîchir périodiquement les données
   - Rafraîchir après chaque action (ajout de lecture, etc.)

---

## Résumé des changements

### Avant
- ❌ Impossible d'ajouter une lecture si le capteur est inactif
- ❌ Les statuts ne sont pas mis à jour automatiquement
- ❌ Le frontend doit gérer manuellement les statuts

### Maintenant
- ✅ Possibilité d'ajouter une lecture même si le capteur est inactif
- ✅ Activation automatique lors de l'ajout d'une lecture
- ✅ Désactivation automatique si pas de lecture depuis 1h
- ✅ Mise à jour automatique lors de la consultation
- ✅ Le frontend reçoit toujours des statuts à jour

---

## Support

Pour toute question ou problème, référez-vous à cette documentation ou contactez l'équipe backend.

