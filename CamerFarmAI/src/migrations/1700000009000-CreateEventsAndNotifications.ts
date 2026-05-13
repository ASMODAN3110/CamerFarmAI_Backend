import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsAndNotifications1700000009000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Certaines bases peuvent déjà contenir ces tables (ex: via InitSchema ou autre migration),
    // donc on rend cette migration idempotente.
    const exists = await queryRunner.query(`
      SELECT
        to_regclass('public."events"') AS "events_exists",
        to_regclass('public."notifications"') AS "notifications_exists"
    `);

    const eventsExists = exists?.[0]?.events_exists !== null;
    const notificationsExists = exists?.[0]?.notifications_exists !== null;

    // --- events ---
    if (!eventsExists) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type_enum') THEN
            CREATE TYPE "event_type_enum" AS ENUM ('seuil_depasse', 'actionneur_active', 'actionneur_desactive');
          END IF;
        END $$;
      `);

      await queryRunner.query(`
        CREATE TABLE "events" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "type" "event_type_enum" NOT NULL,
          "description" TEXT NOT NULL,
          "sensorId" UUID,
          "actuatorId" UUID,
          "date" TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT "PK_events" PRIMARY KEY ("id"),
          CONSTRAINT "FK_events_sensor" FOREIGN KEY ("sensorId")
            REFERENCES "sensors"("id") ON DELETE SET NULL,
          CONSTRAINT "FK_events_actuator" FOREIGN KEY ("actuatorId")
            REFERENCES "actuators"("id") ON DELETE SET NULL
        )
      `);

      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_date" ON "events"("date")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_sensor" ON "events"("sensorId")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_actuator" ON "events"("actuatorId")`);
    }

    // --- notifications ---
    if (!notificationsExists) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_canal_enum') THEN
            CREATE TYPE "notification_canal_enum" AS ENUM ('web', 'email', 'whatsapp');
          END IF;
        END $$;
      `);

      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_statut_enum') THEN
            CREATE TYPE "notification_statut_enum" AS ENUM ('envoyee', 'en_attente', 'erreur');
          END IF;
        END $$;
      `);

      await queryRunner.query(`
        CREATE TABLE "notifications" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "canal" "notification_canal_enum" NOT NULL,
          "statut" "notification_statut_enum" NOT NULL DEFAULT 'en_attente',
          "eventId" UUID NOT NULL,
          "userId" UUID NOT NULL,
          "dateEnvoi" TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
          CONSTRAINT "FK_notifications_event" FOREIGN KEY ("eventId")
            REFERENCES "events"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId")
            REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);

      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications"("userId")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_event" ON "notifications"("eventId")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_statut" ON "notifications"("statut")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer les index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_statut"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_event"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_actuator"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_sensor"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_date"`);

    // Supprimer les tables
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);

    // Supprimer les types enum
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_statut_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_canal_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "event_type_enum"`);
  }
}

