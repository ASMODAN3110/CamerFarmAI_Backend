import { In, MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

type UserSeed = {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

type PlantationSeed = {
  id: string;
  name: string;
  location: string;
  area: number;
  cropType: string;
  ownerId: string;
};

export class SeedDemoData1700000001000 implements MigrationInterface {
  private farmerEmails = [
    'alice.farmer@example.com',
    'bruno.farmer@example.com',
    'carole.farmer@example.com',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const password = await bcrypt.hash('Password!123', 12);

    const users: UserSeed[] = [
      {
        id: randomUUID(),
        phone: '+237610000001',
        email: this.farmerEmails[0],
        firstName: 'Alice',
        lastName: 'Ndongo',
        password,
      },
      {
        id: randomUUID(),
        phone: '+237610000002',
        email: this.farmerEmails[1],
        firstName: 'Bruno',
        lastName: 'Mbia',
        password,
      },
      {
        id: randomUUID(),
        phone: '+237610000003',
        email: this.farmerEmails[2],
        firstName: 'Carole',
        lastName: 'Essomba',
        password,
      },
    ];

    for (const user of users) {
      await queryRunner.manager.insert('users', {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'farmer',
        password: user.password,
      });
    }

    const plantations: PlantationSeed[] = [];

    for (const user of users) {
      plantations.push(
        {
          id: randomUUID(),
          ownerId: user.id,
          name: `${user.firstName} - Champ A`,
          location: 'Littoral',
          area: 2.5,
          cropType: 'manioc',
        },
        {
          id: randomUUID(),
          ownerId: user.id,
          name: `${user.firstName} - Champ B`,
          location: 'Ouest',
          area: 1.8,
          cropType: 'maïs',
        }
      );
    }

    for (const plantation of plantations) {
      await queryRunner.manager.insert('plantations', {
        id: plantation.id,
        ownerId: plantation.ownerId,
        name: plantation.name,
        location: plantation.location,
        area: plantation.area,
        cropType: plantation.cropType,
        coordinates: { lat: 0, lng: 0 },
      });

      await this.insertSensorData(queryRunner, plantation.id);
      await this.insertActuators(queryRunner, plantation.id);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.manager.query(
      'SELECT id, email FROM users WHERE email = ANY($1)',
      [this.farmerEmails]
    ) as Array<{ id: string; email: string }>;

    if (!users.length) {
      return;
    }

    const userIds = users.map(user => user.id);
    const plantations = await queryRunner.manager.query(
      'SELECT id FROM plantations WHERE "ownerId" = ANY($1)',
      [userIds]
    ) as Array<{ id: string }>;

    const plantationIds = plantations.map(plantation => plantation.id);

    if (plantationIds.length) {
      await queryRunner.manager.delete('actuators', { plantationId: In(plantationIds) });
      await queryRunner.manager.delete('sensor_data', { plantationId: In(plantationIds) });
      await queryRunner.manager.delete('plantations', { id: In(plantationIds) });
    }

    await queryRunner.manager.delete('users', { email: In(this.farmerEmails) });
  }

  private async insertSensorData(queryRunner: QueryRunner, plantationId: string) {
    const now = new Date();
    const measurements = [
      {
        temperature: 28.5,
        humidity: 64.2,
        soilMoisture: 45.1,
        luminosity: 820,
      },
      {
        temperature: 26.8,
        humidity: 61.0,
        soilMoisture: 40.4,
        luminosity: 730,
      },
    ];

    for (const measurement of measurements) {
      await queryRunner.manager.insert('sensor_data', {
        id: randomUUID(),
        temperature: measurement.temperature,
        humidity: measurement.humidity,
        soilMoisture: measurement.soilMoisture,
        luminosity: measurement.luminosity,
        status: 'active',
        plantationId,
        timestamp: now,
      });
    }
  }

  private async insertActuators(queryRunner: QueryRunner, plantationId: string) {
    const actuators = [
      {
        name: 'Pompe principale',
        type: 'pump',
        status: 'active',
        metadata: { flowRate: '25L/min' },
      },
      {
        name: 'Ventilateur nord',
        type: 'fan',
        status: 'inactive',
        metadata: { speedLevels: 3 },
      },
      {
        name: 'Éclairage LED',
        type: 'light',
        status: 'active',
        metadata: { spectrum: 'full' },
      },
    ];

    for (const actuator of actuators) {
      await queryRunner.manager.insert('actuators', {
        id: randomUUID(),
        name: actuator.name,
        type: actuator.type,
        status: actuator.status,
        metadata: actuator.metadata,
        plantationId,
      });
    }
  }
}

