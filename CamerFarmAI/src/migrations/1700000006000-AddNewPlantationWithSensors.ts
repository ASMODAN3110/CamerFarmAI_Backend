import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewPlantationWithSensors1700000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver l'utilisateur test.user@example.com
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      ['test.user@example.com', '690123456']
    );

    if (userResult.length === 0) {
      throw new Error('Utilisateur test.user@example.com non trouvé. Exécutez d\'abord la migration 1700000005000-SeedUserWithDevices.ts');
    }

    const userId = userResult[0].id;

    // 2. Créer un nouveau champ pour cet utilisateur
    const plantationResult = await queryRunner.query(
      `INSERT INTO plantations (id, name, location, area, "cropType", "ownerId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        'Nouveau Champ de Test',
        'Yaoundé',
        3.0,
        'cacao',
        userId,
      ]
    );

    const plantationId = plantationResult[0].id;

    // 3. Créer 2 capteurs pour ce nouveau champ
    await queryRunner.query(
      `INSERT INTO sensors (id, type, status, "plantationId", "createdAt", "updatedAt")
       VALUES 
         (gen_random_uuid(), $1, $2, $3, NOW(), NOW()),
         (gen_random_uuid(), $4, $5, $3, NOW(), NOW())`,
      [
        'temperature',
        'active',
        plantationId,
        'soilMoisture',
        'active',
      ]
    );

    // 4. Créer automatiquement les 3 actionneurs par défaut (comme dans le contrôleur)
    // Note: Chaque actionneur nécessite 5 paramètres (name, type, status, metadata, plantationId)
    // On crée 3 actionneurs donc 3 requêtes séparées pour éviter les problèmes de paramètres
    await queryRunner.query(
      `INSERT INTO actuators (id, name, type, status, metadata, "plantationId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        'Pompe principale',
        'pump',
        'active',
        JSON.stringify({ flowRate: '25L/min', power: '300W' }),
        plantationId,
      ]
    );

    await queryRunner.query(
      `INSERT INTO actuators (id, name, type, status, metadata, "plantationId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        'Ventilateur nord',
        'fan',
        'inactive',
        JSON.stringify({ speedLevels: 3, power: '150W' }),
        plantationId,
      ]
    );

    await queryRunner.query(
      `INSERT INTO actuators (id, name, type, status, metadata, "plantationId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        'Éclairage LED',
        'light',
        'active',
        JSON.stringify({ spectrum: 'full', power: '100W' }),
        plantationId,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les données créées (dans l'ordre inverse)
    
    // Trouver l'utilisateur
    const user = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      ['test.user@example.com', '690123456']
    );

    if (user.length > 0) {
      const userId = user[0].id;

      // Trouver la plantation créée
      const plantation = await queryRunner.query(
        `SELECT id FROM plantations WHERE "ownerId" = $1 AND name = $2`,
        [userId, 'Nouveau Champ de Test']
      );

      if (plantation.length > 0) {
        const plantationId = plantation[0].id;

        // Supprimer les actionneurs
        await queryRunner.query(
          `DELETE FROM actuators WHERE "plantationId" = $1`,
          [plantationId]
        );

        // Supprimer les capteurs
        await queryRunner.query(
          `DELETE FROM sensors WHERE "plantationId" = $1`,
          [plantationId]
        );

        // Supprimer la plantation
        await queryRunner.query(
          `DELETE FROM plantations WHERE id = $1`,
          [plantationId]
        );
      }
    }
  }
}

