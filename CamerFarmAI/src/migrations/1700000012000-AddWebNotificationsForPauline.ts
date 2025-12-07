import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebNotificationsForPauline1700000012000 implements MigrationInterface {
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
        description: 'Le capteur de température a détecté une valeur critique de 38°C, supérieure au seuil maximum de 32°C',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'seuil_depasse',
        description: 'Le capteur d\'humidité du sol indique un niveau très bas de 20%, nécessitant une irrigation urgente',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'actionneur_active',
        description: 'Le système d\'irrigation automatique a été activé pour compenser le manque d\'humidité',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'seuil_depasse',
        description: 'Le capteur de luminosité a enregistré une valeur de 1200 lux, dépassant le seuil optimal de 1000 lux',
        sensorId: null,
        actuatorId: null,
      },
      {
        type: 'actionneur_desactive',
        description: 'L\'éclairage LED a été désactivé automatiquement après normalisation de la luminosité',
        sensorId: null,
        actuatorId: null,
      },
    ];

    const eventIds: string[] = [];

    for (const event of events) {
      const eventResult = await queryRunner.query(
        `INSERT INTO events (id, type, description, "sensorId", "actuatorId", date)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() - (random() * interval '5 days'))
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
           NOW() - (random() * interval '5 days'),
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
    // (on les identifie par leur description unique)
    const eventDescriptions = [
      'Le capteur de température a détecté une valeur critique de 38°C, supérieure au seuil maximum de 32°C',
      'Le capteur d\'humidité du sol indique un niveau très bas de 20%, nécessitant une irrigation urgente',
      'Le système d\'irrigation automatique a été activé pour compenser le manque d\'humidité',
      'Le capteur de luminosité a enregistré une valeur de 1200 lux, dépassant le seuil optimal de 1000 lux',
      'L\'éclairage LED a été désactivé automatiquement après normalisation de la luminosité',
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

    // 3. Supprimer les notifications WEB associées (uniquement celles créées par cette migration)
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
