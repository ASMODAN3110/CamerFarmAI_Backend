// src/models/Actuator.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Plantation } from './Plantation.entity';

export enum ActuatorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('actuators')
export class Actuator {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  type!: string;

  @Column({
    type: 'enum',
    enum: ActuatorStatus,
    default: ActuatorStatus.INACTIVE,
  })
  status!: ActuatorStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Plantation, plantation => plantation.actuators, { onDelete: 'CASCADE' })
  plantation!: Plantation;

  @Column('uuid')
  plantationId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  activer(): void {
    this.status = ActuatorStatus.ACTIVE;
  }

  desactiver(): void {
    this.status = ActuatorStatus.INACTIVE;
  }
}

