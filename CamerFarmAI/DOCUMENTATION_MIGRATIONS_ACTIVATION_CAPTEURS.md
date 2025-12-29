# Documentation - Activation des Capteurs Inactifs via Migrations

## Vue d'ensemble

Ce document explique comment créer une migration pour activer des capteurs inactifs d'une plantation en ajoutant des lectures récentes.

## Principe

Un capteur devient `INACTIVE` s'il n'a pas reçu de lecture depuis plus d'1 heure. Pour l'activer via une migration, il faut :

1. **Trouver les capteurs INACTIVE** de la plantation
2. **Ajouter des lectures récentes** (timestamp < 1 heure) pour chaque capteur
3. **Mettre à jour le statut** des capteurs à `ACTIVE` directement dans la base de données

## Migration exemple

### Fichier : `1700000019000-ActivateInactiveSensors.ts`

Cette migration :
- Trouve la plantation "Nouveau Champ de Test"
- Identifie tous les capteurs `INACTIVE`
- Ajoute une lecture récente (il y a 5 minutes) pour chaque capteur inactif
- Met à jour le statut des capteurs à `ACTIVE`

### Structure de la migration

```typescript
export class ActivateInactiveSensors1700000019000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver la plantation
    // 2. Trouver les capteurs INACTIVE
    // 3. Pour chaque capteur inactif :
    //    - Vérifier si une lecture récente existe déjà
    //    - Si non, créer une nouvelle lecture récente
    //    - Mettre à jour le statut à ACTIVE
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les lectures récentes créées
    // Remettre les capteurs en INACTIVE si nécessaire
  }
}
```

## Points importants

### 1. Timestamp des lectures

Les lectures doivent avoir un timestamp récent (moins d'1 heure) :

```typescript
// Lecture il y a 5 minutes (garantit < 1 heure)
const recentTimestamp = new Date(now.getTime() - 5 * 60 * 1000);
```

**Pourquoi 5 minutes ?**
- Garantit que la lecture est récente (< 1 heure)
- Le système considérera automatiquement le capteur comme ACTIVE
- Évite les problèmes de timing si la migration prend du temps

### 2. Vérification des lectures existantes

Avant de créer une nouvelle lecture, vérifier si une lecture récente existe déjà :

```typescript
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const recentReading = await queryRunner.query(
  `SELECT id FROM sensor_readings 
   WHERE "sensorId" = $1 AND timestamp > $2 
   ORDER BY timestamp DESC LIMIT 1`,
  [sensor.id, oneHourAgo.toISOString()]
);
```

**Avantages :**
- Évite les doublons si la migration est exécutée plusieurs fois
- Si une lecture récente existe, on met juste à jour le statut

### 3. Mise à jour directe du statut

Dans la migration, mettre à jour directement le statut dans la base de données :

```typescript
await queryRunner.query(
  `UPDATE sensors SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
  ['active', sensor.id]
);
```

**Pourquoi directement ?**
- Pas besoin d'attendre que `updateSensorStatuses` soit appelé
- Le statut est mis à jour immédiatement
- La migration est autonome et complète

### 4. Génération de valeurs réalistes

Générer des valeurs adaptées au type de capteur :

```typescript
function generateSensorValue(sensorType: string): number {
  switch (sensorType) {
    case 'temperature':
      return 25 + (Math.random() - 0.5) * 10; // 20-32°C
    case 'soilMoisture':
      return 65 + (Math.random() - 0.5) * 20; // 50-85%
    case 'co2Level':
      return 500 + (Math.random() - 0.5) * 300; // 400-850 ppm
    case 'waterLevel':
      return 75 + (Math.random() - 0.5) * 25; // 55-95%
    case 'luminosity':
      return 500 + (Math.random() - 0.5) * 400; // 200-800 lux
    default:
      return 50 + (Math.random() - 0.5) * 20;
  }
}
```

## Utilisation

### Exécuter la migration

```bash
npm run migration:run
```

### Annuler la migration

```bash
npm run migration:revert
```

## Cas d'usage

### Cas 1 : Activer tous les capteurs inactifs d'une plantation

```typescript
// Trouver tous les capteurs INACTIVE
const inactiveSensors = await queryRunner.query(
  `SELECT id, type FROM sensors 
   WHERE "plantationId" = $1 AND status = $2`,
  [plantationId, 'inactive']
);

// Ajouter une lecture récente pour chacun
for (const sensor of inactiveSensors) {
  const value = generateSensorValue(sensor.type);
  const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000);
  
  await queryRunner.query(
    `INSERT INTO sensor_readings (id, value, "sensorId", timestamp)
     VALUES (gen_random_uuid(), $1, $2, $3)`,
    [value, sensor.id, recentTimestamp.toISOString()]
  );
  
  await queryRunner.query(
    `UPDATE sensors SET status = $1 WHERE id = $2`,
    ['active', sensor.id]
  );
}
```

### Cas 2 : Activer un capteur spécifique

```typescript
// Trouver un capteur spécifique
const sensor = await queryRunner.query(
  `SELECT id, type FROM sensors WHERE id = $1 AND status = $2`,
  [sensorId, 'inactive']
);

if (sensor.length > 0) {
  const value = generateSensorValue(sensor[0].type);
  const recentTimestamp = new Date(Date.now() - 5 * 60 * 1000);
  
  await queryRunner.query(
    `INSERT INTO sensor_readings (id, value, "sensorId", timestamp)
     VALUES (gen_random_uuid(), $1, $2, $3)`,
    [value, sensor[0].id, recentTimestamp.toISOString()]
  );
  
  await queryRunner.query(
    `UPDATE sensors SET status = $1 WHERE id = $2`,
    ['active', sensor[0].id]
  );
}
```

## Méthode `down()` - Rollback

La méthode `down()` doit :
1. Supprimer les lectures récentes créées par la migration
2. Vérifier si d'autres lectures récentes existent
3. Si aucune lecture récente ne reste, remettre le capteur en `INACTIVE`

```typescript
public async down(queryRunner: QueryRunner): Promise<void> {
  // Supprimer les lectures récentes (< 1 heure)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  await queryRunner.query(
    `DELETE FROM sensor_readings 
     WHERE "sensorId" = $1 AND timestamp > $2`,
    [sensorId, oneHourAgo.toISOString()]
  );
  
  // Vérifier s'il reste des lectures récentes
  const remaining = await queryRunner.query(
    `SELECT COUNT(*) as count FROM sensor_readings 
     WHERE "sensorId" = $1 AND timestamp > $2`,
    [sensorId, oneHourAgo.toISOString()]
  );
  
  // Si aucune lecture récente, remettre en INACTIVE
  if (parseInt(remaining[0].count) === 0) {
    await queryRunner.query(
      `UPDATE sensors SET status = $1 WHERE id = $2`,
      ['inactive', sensorId]
    );
  }
}
```

## Bonnes pratiques

### 1. Vérifier l'existence avant d'agir

Toujours vérifier que la plantation et les capteurs existent avant de les modifier :

```typescript
const plantation = await queryRunner.query(
  `SELECT id FROM plantations WHERE name = $1`,
  ['Nom de la plantation']
);

if (plantation.length === 0) {
  console.log('Plantation non trouvée');
  return; // Ne pas faire échouer la migration
}
```

### 2. Gérer les cas où aucun capteur inactif n'existe

Si aucun capteur inactif n'est trouvé, ne pas faire échouer la migration :

```typescript
if (inactiveSensors.length === 0) {
  console.log('Aucun capteur inactif trouvé');
  return; // Migration réussie, rien à faire
}
```

### 3. Logging informatif

Ajouter des messages de log pour suivre l'exécution :

```typescript
console.log(`✓ ${inactiveSensors.length} capteur(s) inactif(s) trouvé(s)`);
console.log(`✓ Capteur ${sensor.type} activé`);
console.log(`✓ Migration terminée : ${activatedCount} capteur(s) activé(s)`);
```

### 4. Protection contre les doublons

Vérifier si des lectures récentes existent déjà avant d'en créer de nouvelles :

```typescript
const recentReading = await queryRunner.query(
  `SELECT id FROM sensor_readings 
   WHERE "sensorId" = $1 AND timestamp > $2 
   ORDER BY timestamp DESC LIMIT 1`,
  [sensor.id, oneHourAgo.toISOString()]
);

if (recentReading.length > 0) {
  // Lecture récente existe déjà, juste mettre à jour le statut
  await queryRunner.query(
    `UPDATE sensors SET status = $1 WHERE id = $2`,
    ['active', sensor.id]
  );
  continue; // Passer au capteur suivant
}
```

## Alternative : Mise à jour directe (non recommandée)

Si vous voulez simplement activer les capteurs sans ajouter de lectures :

```typescript
// ⚠️ NON RECOMMANDÉ
await queryRunner.query(
  `UPDATE sensors SET status = $1 
   WHERE "plantationId" = $2 AND status = $3`,
  ['active', plantationId, 'inactive']
);
```

**Pourquoi ce n'est pas recommandé ?**
- Les capteurs n'auront pas de lectures récentes
- Ils redeviendront `INACTIVE` lors de la prochaine vérification automatique (appel à `updateSensorStatuses`)
- L'activation n'est pas durable
- Il vaut mieux ajouter des lectures récentes pour que l'activation soit permanente

## Résumé

Pour activer des capteurs inactifs via une migration :

1. ✅ Trouver les capteurs `INACTIVE` de la plantation
2. ✅ Vérifier si des lectures récentes existent déjà
3. ✅ Si non, créer une lecture récente (timestamp < 1 heure)
4. ✅ Mettre à jour le statut à `ACTIVE`
5. ✅ Implémenter la méthode `down()` pour le rollback

Cette approche garantit que les capteurs resteront actifs car ils ont des lectures récentes, et l'activation sera durable.

