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
  @Column({ type: DataType.INTEGER, field: 'user_id' })
  userId!: number;

  @ForeignKey(() => Quiz)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'quiz_id' })
  quizId!: number;

  @Default(AttemptStatus.IN_PROGRESS)
  @Column(DataType.ENUM(...Object.values(AttemptStatus)))
  status!: AttemptStatus;

  @Default(0)
  @Column(DataType.INTEGER)
  score!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'max_score' })
  maxScore!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'correct_answers' })
  correctAnswers!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'total_questions' })
  totalQuestions!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'time_spent' })
  timeSpent!: number;

  @Default(0.00)
  @Column({ type: DataType.DECIMAL(5,2), field: 'completion_percentage' })
  completionPercentage!: number;

  @Column({ type: DataType.DATE, field: 'started_at' })
  startedAt?: Date;

  @Column({ type: DataType.DATE, field: 'completed_at' })
  completedAt?: Date;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => User, 'userId')
  user!: User;

  @BelongsTo(() => Quiz, 'quizId')
  quiz!: Quiz;

  @HasMany(() => QuizAttemptAnswer, 'attemptId')
  answers!: QuizAttemptAnswer[];
}
