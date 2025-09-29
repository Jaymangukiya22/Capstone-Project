import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { User } from './User';
import { Quiz } from './Quiz';
import { QuizAttemptAnswer } from './QuizAttemptAnswer';
import { AttemptStatus } from '../types/enums';

@Table({
  tableName: 'quiz_attempts',
  timestamps: true,
})
export class QuizAttempt extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  userId!: number;

  @ForeignKey(() => Quiz)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  quizId!: number;

  @Default(AttemptStatus.IN_PROGRESS)
  @Column(DataType.ENUM(...Object.values(AttemptStatus)))
  status!: AttemptStatus;

  @Default(0)
  @Column(DataType.INTEGER)
  score!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  totalQuestions!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  correctAnswers!: number;

  @Column(DataType.INTEGER)
  timeSpent?: number;

  @Column(DataType.DATE)
  startedAt?: Date;

  @Column(DataType.DATE)
  completedAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => User, 'userId')
  user!: User;

  @BelongsTo(() => Quiz, 'quizId')
  quiz!: Quiz;

  @HasMany(() => QuizAttemptAnswer, 'attemptId')
  answers!: QuizAttemptAnswer[];
}
