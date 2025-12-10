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
  @Column({ type: DataType.STRING(255), field: 'password_hash' })
  passwordHash!: string;

  @Default(UserRole.PLAYER)
  @Column(DataType.ENUM(...Object.values(UserRole)))
  role!: UserRole;

  @Column({ type: DataType.STRING(50), field: 'first_name' })
  firstName?: string;

  @Column({ type: DataType.STRING(50), field: 'last_name' })
  lastName?: string;

  @Column(DataType.STRING(255))
  avatar?: string;

  @Default(1200)
  @Column({ type: DataType.INTEGER, field: 'elo_rating' })
  eloRating!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'total_matches' })
  totalMatches!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  wins!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  losses!: number;

  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'is_active' })
  isActive!: boolean;

  @Column({ type: DataType.DATE, field: 'last_login_at' })
  lastLoginAt?: Date;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
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
