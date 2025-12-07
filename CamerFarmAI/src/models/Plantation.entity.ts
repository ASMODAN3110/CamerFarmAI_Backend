// src/models/Plantation.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User.entity';
import type { Actuator } from './Actuator.entity';

export enum PlantationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PlantationMode {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
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
  area?: number;                    // en m² (mètres carrés) - le frontend convertit automatiquement depuis différentes unités

  @Column()
  cropType!: string;                 // ex: "manioc", "maïs", "arachide"

  @Column({ type: 'jsonb', nullable: true })
  coordinates?: { lat: number; lng: number }; // pour carte future

  @Column({
    type: 'enum',
    enum: PlantationMode,
    default: PlantationMode.AUTOMATIC,
  })
  mode!: PlantationMode; // Mode de contrôle : automatique ou manuel

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

  getEtat(): {
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    activeSensors: number;
    totalSensors: number;
    activeActuators: number;
    totalActuators: number;
    message: string;
  } {
    const sensors = this.sensors || [];
    const actuators = this.actuators || [];
    
    const activeSensors = sensors.filter((s: any) => s.status === 'active').length;
    const totalSensors = sensors.length;
    const activeActuators = actuators.filter((a: any) => a.status === 'active').length;
    const totalActuators = actuators.length;

    // Déterminer l'état global
    let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'unknown';
    let message = 'État inconnu';

    if (totalSensors === 0 && totalActuators === 0) {
      status = 'unknown';
      message = 'Aucun capteur ou actionneur configuré';
    } else if (activeSensors === 0 && totalSensors > 0) {
      status = 'critical';
      message = 'Aucun capteur actif';
    } else if (activeSensors < totalSensors * 0.5) {
      status = 'warning';
      message = 'Moins de la moitié des capteurs sont actifs';
    } else {
      status = 'healthy';
      message = 'Tous les systèmes fonctionnent normalement';
    }

    return {
      status,
      activeSensors,
      totalSensors,
      activeActuators,
      totalActuators,
      message,
    };
  }
}