import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Unique,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
// Using string references to avoid circular imports
import { QuestionBankItem } from './QuestionBankItem';
import { Quiz } from './Quiz';
import { QuizAttempt } from './QuizAttempt';
import { MatchPlayer } from './MatchPlayer';
import { UserRole } from '../types/enums';

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(50))
  username!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(100))
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  passwordHash!: string;

  @Default(UserRole.PLAYER)
  @Column(DataType.ENUM(...Object.values(UserRole)))
  role!: UserRole;

  @Column(DataType.STRING(50))
  firstName?: string;

  @Column(DataType.STRING(50))
  lastName?: string;

  @Column(DataType.STRING(255))
  avatar?: string;

  @Default(1200)
  @Column(DataType.INTEGER)
  eloRating!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  totalMatches!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  wins!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  losses!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @Column(DataType.DATE)
  lastLoginAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @HasMany(() => QuestionBankItem, 'createdById')
  createdQuestions!: QuestionBankItem[];

  @HasMany(() => Quiz, 'createdById')
  createdQuizzes!: Quiz[];

  @HasMany(() => QuizAttempt, 'userId')
  quizAttempts!: QuizAttempt[];

  @HasMany(() => MatchPlayer, 'userId')
  matchPlayers!: MatchPlayer[];
}
