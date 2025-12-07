import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsForPauline1700000011000 implements MigrationInterface {
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

    // 2. Créer 5 événements variés
    const events = [
      {
        type: 'seuil_depasse',
        description: 'Le capteur de température a enregistré une valeur (35°C) supérieure au seuil maximum (30°C)',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'seuil_depasse',
        description: 'Le capteur d\'humidité du sol a enregistré une valeur (25%) inférieure au seuil minimum (40%)',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'actionneur_active',
        description: 'La pompe principale a été activée automatiquement pour l\'irrigation',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'actionneur_desactive',
        description: 'Le ventilateur nord a été désactivé après normalisation de la température',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'seuil_depasse',
        description: 'Le capteur de CO2 a enregistré une valeur (850 ppm) supérieure au seuil maximum (800 ppm)',
        sensorId: null,
        actuatorId: null,
      },
    ];

    const eventIds: string[] = [];

    for (const event of events) {
      const eventResult = await queryRunner.query(
        `INSERT INTO events (id, type, description, "sensorId", "actuatorId", date)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() - (random() * interval '7 days'))
         RETURNING id`,
        [event.type, event.description, event.sensorId, event.actuatorId]
      );
      eventIds.push(eventResult[0].id);
    }

    // 3. Créer 5 notifications pour Pauline avec différents canaux et statuts
    const notifications = [
      {
        canal: 'web',
        statut: 'envoyee',
        eventId: eventIds[0],
        isRead: false,
        dateLu: null,
      },
      {
        canal: 'email',
        statut: 'envoyee',
        eventId: eventIds[1],
        isRead: true,
        dateLu: 'NOW() - interval \'2 days\'',
      },
      {
        canal: 'whatsapp',
        statut: 'envoyee',
        eventId: eventIds[2],
        isRead: false,
        dateLu: null,
      },
      {
        canal: 'web',
        statut: 'envoyee',
        eventId: eventIds[3],
        isRead: true,
        dateLu: 'NOW() - interval \'1 day\'',
      },
      {
        canal: 'email',
        statut: 'envoyee',
        eventId: eventIds[4],
        isRead: false,
        dateLu: null,
      },
    ];

    for (const notification of notifications) {
      if (notification.dateLu) {
        // Notification lue avec dateLu
        await queryRunner.query(
          `INSERT INTO notifications (id, canal, statut, "eventId", "userId", "dateEnvoi", "isRead", "dateLu")
           VALUES (
             gen_random_uuid(),
             $1,
             $2,
             $3,
             $4,
             NOW() - (random() * interval '7 days'),
             $5,
             ${notification.dateLu}
           )`,
          [
            notification.canal,
            notification.statut,
            notification.eventId,
            userId,
            notification.isRead,
          ]
        );
      } else {
        // Notification non lue (dateLu = NULL)
        await queryRunner.query(
          `INSERT INTO notifications (id, canal, statut, "eventId", "userId", "dateEnvoi", "isRead", "dateLu")
           VALUES (
             gen_random_uuid(),
             $1,
             $2,
             $3,
             $4,
             NOW() - (random() * interval '7 days'),
             $5,
             NULL
           )`,
          [
            notification.canal,
            notification.statut,
            notification.eventId,
            userId,
            notification.isRead,
          ]
        );
      }
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
    // (on les identifie par leur description unique)
    const eventDescriptions = [
      'Le capteur de température a enregistré une valeur (35°C) supérieure au seuil maximum (30°C)',
      'Le capteur d\'humidité du sol a enregistré une valeur (25%) inférieure au seuil minimum (40%)',
      'La pompe principale a été activée automatiquement pour l\'irrigation',
      'Le ventilateur nord a été désactivé après normalisation de la température',
      'Le capteur de CO2 a enregistré une valeur (850 ppm) supérieure au seuil maximum (800 ppm)',
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

    // 3. Supprimer les notifications associées
    if (eventIds.length > 0) {
      await queryRunner.query(
        `DELETE FROM notifications WHERE "userId" = $1 AND "eventId" = ANY($2::uuid[])`,
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

