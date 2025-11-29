import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedUserWithDevices1700000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Créer un utilisateur
    const hashedPassword = await bcrypt.hash('Password!123', 12);
    
    const userResult = await queryRunner.query(
      `INSERT INTO users (id, phone, email, "firstName", "lastName", role, password, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [
        '690123456',
        'test.user@example.com',
        'Test',
        'User',
        'farmer',
        hashedPassword,
      ]
    );

    const userId = userResult[0].id;

    // 2. Créer une plantation pour cet utilisateur
    const plantationResult = await queryRunner.query(
      `INSERT INTO plantations (id, name, location, area, "cropType", "ownerId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        'Champ de test',
        'Douala',
        2.5,
        'maïs',
        userId,
      ]
    );

    const plantationId = plantationResult[0].id;

    // 3. Créer 2 actionneurs pour cette plantation
    await queryRunner.query(
      `INSERT INTO actuators (id, name, type, status, metadata, "plantationId", "createdAt", "updatedAt")
       VALUES 
         (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()),
         (gen_random_uuid(), $6, $7, $8, $9, $5, NOW(), NOW())`,
      [
        'Pompe principale',
        'pump',
        'active',
        JSON.stringify({ flowRate: '25L/min', power: '300W' }),
        plantationId,
        'Ventilateur nord',
        'fan',
        'active',
        JSON.stringify({ speedLevels: 3, power: '150W' }),
      ]
    );

    // 4. Créer 1 capteur pour cette plantation
    await queryRunner.query(
      `INSERT INTO sensors (id, type, status, "plantationId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
      [
        'temperature',
        'active',
        plantationId,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les données créées (dans l'ordre inverse)
    
    // Trouver l'utilisateur créé
    const user = await queryRunner.query(
      `SELECT id FROM users WHERE phone = $1`,
      ['690123456']
    );

    if (user.length > 0) {
      const userId = user[0].id;

      // Trouver la plantation de cet utilisateur
      const plantation = await queryRunner.query(
        `SELECT id FROM plantations WHERE "ownerId" = $1 AND name = $2`,
        [userId, 'Champ de test']
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

      // Supprimer l'utilisateur
      await queryRunner.query(
        `DELETE FROM users WHERE id = $1`,
        [userId]
      );
    }
  }
}

