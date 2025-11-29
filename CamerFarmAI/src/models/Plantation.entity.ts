// src/models/Plantation.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User.entity';
import type { Actuator } from './Actuator.entity';

export enum PlantationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('plantations')
export class Plantation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;                    // ex: "Champ de manioc Nord"

  @Column({ nullable: true })
  location!: string;                // ex: "Bafoussam, Ouest"

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  area?: number;                    // en hectares

  @Column()
  cropType!: string;                 // ex: "manioc", "maïs", "arachide"

  @Column({ type: 'jsonb', nullable: true })
  coordinates?: { lat: number; lng: number }; // pour carte future

  @ManyToOne(() => User, user => user.plantations)
  owner!: User;

  @Column('uuid')
  ownerId!: string;

  @OneToMany(() => require('./Sensor.entity').Sensor, (sensor: any) => sensor.plantation)
  sensors!: any[];

  @OneToMany(() => require('./Actuator.entity').Actuator, (actuator: Actuator) => actuator.plantation)
  actuators!: Actuator[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}