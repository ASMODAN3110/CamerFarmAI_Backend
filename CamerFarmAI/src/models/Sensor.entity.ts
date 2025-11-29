// src/models/Sensor.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Plantation } from './Plantation.entity';

export enum SensorType {
  TEMPERATURE = 'temperature',
  SOIL_MOISTURE = 'soilMoisture',
  CO2_LEVEL = 'co2Level',
  WATER_LEVEL = 'waterLevel',
  LUMINOSITY = 'luminosity',
}

export enum SensorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: SensorType,
  })
  type!: SensorType;

  @Column({
    type: 'enum',
    enum: SensorStatus,
    default: SensorStatus.ACTIVE,
  })
  status!: SensorStatus;

  @ManyToOne(() => Plantation, plantation => plantation.sensors, { onDelete: 'CASCADE' })
  plantation!: Plantation;

  @Column('uuid')
  plantationId!: string;

  @OneToMany(() => require('./SensorReading.entity').SensorReading, (reading: any) => reading.sensor)
  readings!: any[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

