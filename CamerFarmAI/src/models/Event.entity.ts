// src/models/Event.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Sensor } from './Sensor.entity';
import { Actuator } from './Actuator.entity';

export enum EventType {
  SEUIL_DEPASSE = 'seuil_depasse',
  THRESHOLD_CHANGED = 'threshold_changed',
  ACTIONNEUR_ACTIVE = 'actionneur_active',
  ACTIONNEUR_DESACTIVE = 'actionneur_desactive',
  MODE_CHANGED = 'mode_changed',
  SENSOR_ACTIVE = 'sensor_active',
  SENSOR_INACTIVE = 'sensor_inactive',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  type!: EventType;

  @Column({ type: 'text' })
  description!: string;

  @ManyToOne(() => Sensor, { nullable: true, onDelete: 'SET NULL' })
  sensor?: Sensor;

  @Column('uuid', { nullable: true })
  sensorId?: string;

  @ManyToOne(() => Actuator, { nullable: true, onDelete: 'SET NULL' })
  actuator?: Actuator;

  @Column('uuid', { nullable: true })
  actuatorId?: string;

  @CreateDateColumn()
  date!: Date;

  @OneToMany(() => require('./Notification.entity').Notification, (notification: any) => notification.event)
  notifications!: any[];
}

