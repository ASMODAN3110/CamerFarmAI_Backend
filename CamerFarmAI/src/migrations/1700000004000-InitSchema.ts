import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1700000004000 implements MigrationInterface {
    name = 'InitSchema1700000004000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Vérifier et créer plantations_mode_enum si nécessaire
        const plantationsModeEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'plantations_mode_enum'
        `);
        if (plantationsModeEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."plantations_mode_enum" AS ENUM('automatic', 'manual')`);
        }

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "plantations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "location" character varying, "area" numeric(10,2), "cropType" character varying NOT NULL, "coordinates" jsonb, "mode" "public"."plantations_mode_enum" NOT NULL DEFAULT 'automatic', "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c07fbcfbafe1c17dbc3a0aece6c" PRIMARY KEY ("id"))`);

        // Vérifier et créer users_role_enum si nécessaire
        const usersRoleEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'users_role_enum'
        `);
        if (usersRoleEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('farmer', 'technician', 'admin')`);
        }

        // Vérifier et créer users_authprovider_enum si nécessaire
        const usersAuthProviderEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'users_authprovider_enum'
        `);
        if (usersAuthProviderEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."users_authprovider_enum" AS ENUM('local')`);
        }

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phone" character varying NOT NULL, "email" character varying, "firstName" character varying, "lastName" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'farmer', "password" character varying, "authProvider" "public"."users_authprovider_enum" NOT NULL DEFAULT 'local', "twoFactorSecret" character varying, "twoFactorEnabled" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "avatarUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);

        // Vérifier et créer sensors_type_enum si nécessaire
        const sensorsTypeEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'sensors_type_enum'
        `);
        if (sensorsTypeEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."sensors_type_enum" AS ENUM('temperature', 'soilMoisture', 'co2Level', 'waterLevel', 'luminosity')`);
        }

        // Vérifier et créer sensors_status_enum si nécessaire
        const sensorsStatusEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'sensors_status_enum'
        `);
        if (sensorsStatusEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."sensors_status_enum" AS ENUM('active', 'inactive')`);
        }

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sensors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."sensors_type_enum" NOT NULL, "status" "public"."sensors_status_enum" NOT NULL DEFAULT 'active', "plantationId" uuid NOT NULL, "seuilMin" numeric(10,2), "seuilMax" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8bd5fcfd700e39e96bcd9ba6b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sensor_readings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "value" numeric(10,2) NOT NULL, "sensorId" uuid NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ae97fcc8df9e5662d9d007d102b" PRIMARY KEY ("id"))`);

        // Vérifier et créer actuators_status_enum si nécessaire
        const actuatorsStatusEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'actuators_status_enum'
        `);
        if (actuatorsStatusEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."actuators_status_enum" AS ENUM('active', 'inactive')`);
        }

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "actuators" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" character varying NOT NULL, "status" "public"."actuators_status_enum" NOT NULL DEFAULT 'inactive', "metadata" jsonb, "plantationId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e6a7e3c637183809409748d5956" PRIMARY KEY ("id"))`);

        // Vérifier et créer events_type_enum si nécessaire
        const eventsTypeEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'events_type_enum'
        `);
        if (eventsTypeEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."events_type_enum" AS ENUM('seuil_depasse', 'threshold_changed', 'actionneur_active', 'actionneur_desactive', 'mode_changed', 'sensor_active', 'sensor_inactive')`);
        }

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."events_type_enum" NOT NULL, "description" text NOT NULL, "sensorId" uuid, "actuatorId" uuid, "date" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);

        // Vérifier et créer notifications_canal_enum si nécessaire
        const notificationsCanalEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'notifications_canal_enum'
        `);
        if (notificationsCanalEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."notifications_canal_enum" AS ENUM('web', 'email', 'whatsapp')`);
        }

        // Vérifier et créer notifications_statut_enum si nécessaire
        const notificationsStatutEnumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'notifications_statut_enum'
        `);
        if (notificationsStatutEnumExists.length === 0) {
            await queryRunner.query(`CREATE TYPE "public"."notifications_statut_enum" AS ENUM('envoyee', 'en_attente', 'erreur')`);
        }

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "canal" "public"."notifications_canal_enum" NOT NULL, "statut" "public"."notifications_statut_enum" NOT NULL DEFAULT 'en_attente', "eventId" uuid NOT NULL, "userId" uuid NOT NULL, "dateEnvoi" TIMESTAMP NOT NULL DEFAULT now(), "isRead" boolean NOT NULL DEFAULT false, "dateLu" TIMESTAMP, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);

        // Vérifier et ajouter les contraintes de clés étrangères si elles n'existent pas
        const fkPlantationsOwnerExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_f9c8396e285c462c41a7e918e29' 
            AND table_name = 'plantations'
        `);
        if (fkPlantationsOwnerExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "plantations" ADD CONSTRAINT "FK_f9c8396e285c462c41a7e918e29" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }

        const fkSensorsPlantationExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_32a917141abacfdcca7c4a0a6a4' 
            AND table_name = 'sensors'
        `);
        if (fkSensorsPlantationExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "sensors" ADD CONSTRAINT "FK_32a917141abacfdcca7c4a0a6a4" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }

        const fkSensorReadingsSensorExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_2294ea040e40e484fc719bd75bc' 
            AND table_name = 'sensor_readings'
        `);
        if (fkSensorReadingsSensorExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "sensor_readings" ADD CONSTRAINT "FK_2294ea040e40e484fc719bd75bc" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }

        const fkActuatorsPlantationExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_9fc26f33c4023528fb24b784885' 
            AND table_name = 'actuators'
        `);
        if (fkActuatorsPlantationExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "actuators" ADD CONSTRAINT "FK_9fc26f33c4023528fb24b784885" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }

        const fkEventsSensorExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_b00e5d835120993ecfdb5750ddb' 
            AND table_name = 'events'
        `);
        if (fkEventsSensorExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_b00e5d835120993ecfdb5750ddb" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        }

        const fkEventsActuatorExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_d1904289df70a45d6d39a1e418d' 
            AND table_name = 'events'
        `);
        if (fkEventsActuatorExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_d1904289df70a45d6d39a1e418d" FOREIGN KEY ("actuatorId") REFERENCES "actuators"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        }

        const fkNotificationsEventExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_3337493bfdc5d0fccd4bd5f51e3' 
            AND table_name = 'notifications'
        `);
        if (fkNotificationsEventExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3337493bfdc5d0fccd4bd5f51e3" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }

        const fkNotificationsUserExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_692a909ee0fa9383e7859f9b406' 
            AND table_name = 'notifications'
        `);
        if (fkNotificationsUserExists.length === 0) {
            await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3337493bfdc5d0fccd4bd5f51e3"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_d1904289df70a45d6d39a1e418d"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_b00e5d835120993ecfdb5750ddb"`);
        await queryRunner.query(`ALTER TABLE "actuators" DROP CONSTRAINT "FK_9fc26f33c4023528fb24b784885"`);
        await queryRunner.query(`ALTER TABLE "sensor_readings" DROP CONSTRAINT "FK_2294ea040e40e484fc719bd75bc"`);
        await queryRunner.query(`ALTER TABLE "sensors" DROP CONSTRAINT "FK_32a917141abacfdcca7c4a0a6a4"`);
        await queryRunner.query(`ALTER TABLE "plantations" DROP CONSTRAINT "FK_f9c8396e285c462c41a7e918e29"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_statut_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_canal_enum"`);
        await queryRunner.query(`DROP TABLE "events"`);
        await queryRunner.query(`DROP TYPE "public"."events_type_enum"`);
        await queryRunner.query(`DROP TABLE "actuators"`);
        await queryRunner.query(`DROP TYPE "public"."actuators_status_enum"`);
        await queryRunner.query(`DROP TABLE "sensor_readings"`);
        await queryRunner.query(`DROP TABLE "sensors"`);
        await queryRunner.query(`DROP TYPE "public"."sensors_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sensors_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_authprovider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "plantations"`);
        await queryRunner.query(`DROP TYPE "public"."plantations_mode_enum"`);
    }

}
