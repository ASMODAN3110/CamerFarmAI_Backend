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
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  phone!: string | null;                    // Numéro principal au Cameroun (nullable pour les utilisateurs Google)

  @Column({ 
    type: 'varchar', 
    unique: true, 
    nullable: true 
  })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true })
  firstName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName!: string | null;

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

  @Column({ type: 'varchar', nullable: true, unique: true })
  googleId!: string | null;                 // ID Google de l'utilisateur

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