// src/models/Notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Event } from './Event.entity';
import { User } from './User.entity';

export enum NotificationCanal {
  WEB = 'web',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum NotificationStatut {
  ENVOYEE = 'envoyee',
  EN_ATTENTE = 'en_attente',
  ERREUR = 'erreur',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: NotificationCanal,
  })
  canal!: NotificationCanal;

  @Column({
    type: 'enum',
    enum: NotificationStatut,
    default: NotificationStatut.EN_ATTENTE,
  })
  statut!: NotificationStatut;

  @ManyToOne(() => Event, event => event.notifications, { onDelete: 'CASCADE' })
  event!: Event;

  @Column('uuid')
  eventId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column('uuid')
  userId!: string;

  @CreateDateColumn()
  dateEnvoi!: Date;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ nullable: true })
  dateLu?: Date;
}

