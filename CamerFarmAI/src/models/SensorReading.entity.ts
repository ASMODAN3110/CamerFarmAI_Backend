// src/models/SensorReading.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Sensor } from './Sensor.entity';

@Entity('sensor_readings')
export class SensorReading {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  value!: number;

  @ManyToOne(() => Sensor, sensor => sensor.readings, { onDelete: 'CASCADE' })
  sensor!: Sensor;

  @Column('uuid')
  sensorId!: string;

  @CreateDateColumn()
  timestamp!: Date;
}

