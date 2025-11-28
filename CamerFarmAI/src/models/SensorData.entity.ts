// src/models/SensorData.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Plantation } from './Plantation.entity';

export enum SensorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('sensor_data')
export class SensorData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('decimal', { precision: 5, scale: 2 })
  temperature!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  humidity!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  soilMoisture!: number;

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  luminosity?: number;

  @Column({
    type: 'enum',
    enum: SensorStatus,
    default: SensorStatus.ACTIVE,
  })
  status!: SensorStatus;

  @ManyToOne(() => Plantation, plantation => plantation.sensorData)
  plantation!: Plantation;

  @Column('uuid')
  plantationId!: string;

  @CreateDateColumn()
  timestamp!: Date;
}