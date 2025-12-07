import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMoreWebNotificationsForPauline1700000013000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver l'utilisateur Pauline Ndoumbé par son email
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['pauline@example.com']
    );

    if (userResult.length === 0) {
      throw new Error('Utilisateur pauline@example.com non trouvé. Veuillez créer cet utilisateur d\'abord.');
    }

    const userId = userResult[0].id;

    // 2. Créer 5 nouveaux événements variés
    const events = [
      {
        type: 'seuil_depasse',
        description: 'Le capteur de niveau d\'eau a détecté un niveau critique de 15%, nécessitant un remplissage urgent du réservoir',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'actionneur_active',
        description: 'La pompe d\'irrigation a été activée automatiquement suite à la détection d\'un manque d\'humidité',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'seuil_depasse',
        description: 'Le capteur de CO2 a enregistré une concentration élevée de 950 ppm, dépassant le seuil recommandé de 800 ppm',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'actionneur_active',
        description: 'Le système de ventilation a été activé pour améliorer la circulation d\'air dans la serre',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'seuil_depasse',
        description: 'Le capteur de température du sol indique une valeur de 28°C, proche du seuil maximum de 30°C',
        sensorId: null,
        actuatorId: null,
      },
    ];

    const eventIds: string[] = [];

    for (const event of events) {
      const eventResult = await queryRunner.query(
        `INSERT INTO events (id, type, description, "sensorId", "actuatorId", date)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() - (random() * interval '3 days'))
         RETURNING id`,
        [event.type, event.description, event.sensorId, event.actuatorId]
      );
      eventIds.push(eventResult[0].id);
    }

    // 3. Créer 5 notifications WEB non lues pour Pauline
    for (const eventId of eventIds) {
      await queryRunner.query(
        `INSERT INTO notifications (id, canal, statut, "eventId", "userId", "dateEnvoi", "isRead", "dateLu")
         VALUES (
           gen_random_uuid(),
           'web',
           'envoyee',
           $1,
           $2,
           NOW() - (random() * interval '3 days'),
           false,
           NULL
         )`,
        [eventId, userId]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Trouver l'utilisateur Pauline Ndoumbé
    const userResult = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['pauline@example.com']
    );

    if (userResult.length === 0) {
      return; // Si l'utilisateur n'existe pas, rien à supprimer
    }

    const userId = userResult[0].id;

    // 2. Récupérer les IDs des événements créés par cette migration
    const eventDescriptions = [
      'Le capteur de niveau d\'eau a détecté un niveau critique de 15%, nécessitant un remplissage urgent du réservoir',
      'La pompe d\'irrigation a été activée automatiquement suite à la détection d\'un manque d\'humidité',
      'Le capteur de CO2 a enregistré une concentration élevée de 950 ppm, dépassant le seuil recommandé de 800 ppm',
      'Le système de ventilation a été activé pour améliorer la circulation d\'air dans la serre',
      'Le capteur de température du sol indique une valeur de 28°C, proche du seuil maximum de 30°C',
    ];

    const eventIds: string[] = [];
    for (const description of eventDescriptions) {
      const eventResult = await queryRunner.query(
        `SELECT id FROM events WHERE description = $1`,
        [description]
      );
      if (eventResult.length > 0) {
        eventIds.push(eventResult[0].id);
      }
    }

    // 3. Supprimer les notifications WEB associées
    if (eventIds.length > 0) {
      await queryRunner.query(
        `DELETE FROM notifications 
         WHERE "userId" = $1 
         AND "eventId" = ANY($2::uuid[])
         AND canal = 'web'
         AND "isRead" = false
         AND "dateLu" IS NULL`,
        [userId, eventIds]
      );
    }

    // 4. Supprimer les événements
    if (eventIds.length > 0) {
      await queryRunner.query(
        `DELETE FROM events WHERE id = ANY($1::uuid[])`,
        [eventIds]
      );
    }
  }
}

