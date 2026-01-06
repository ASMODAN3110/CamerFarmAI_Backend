import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Plantation } from './Plantation.entity';

export enum UserRole {
  FARMER = 'farmer',
  TECHNICIAN = 'technician',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  phone!: string;                    // Numéro principal au Cameroun

  @Column({ 
    type: 'varchar', 
    unique: true, 
    nullable: true 
  })
  email!: string | null;

  @Column({ nullable: true })
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.FARMER,
  })
  role!: UserRole;

  @Column({ type: 'varchar', nullable: true })
  password!: string | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  @Column({ type: 'varchar', nullable: true })
  twoFactorSecret!: string | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Plantation, plantation => plantation.owner, { onDelete: 'CASCADE' })
  plantations!: Plantation[];

  @BeforeInsert()
  async hashPassword() {
    // Ne hasher le mot de passe que s'il est fourni
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return bcrypt.compare(plainPassword, this.password);
  }
}