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
} from 'sequelize-typescript';
import { Quiz } from './Quiz';
import { QuestionBankItem } from './QuestionBankItem';

@Table({
  tableName: 'quiz_questions',
  timestamps: true,
})
export class QuizQuestion extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => Quiz)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'quiz_id' })
  quizId!: number;

  @ForeignKey(() => QuestionBankItem)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'question_id' })
  questionId!: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'order_index' })
  orderIndex!: number;

  @Default(100)
  @Column(DataType.INTEGER)
  points!: number;

  @Column({ type: DataType.INTEGER, field: 'time_limit' })
  timeLimit?: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => Quiz, 'quizId')
  quiz!: Quiz;

  @BelongsTo(() => QuestionBankItem, 'questionId')
  question!: QuestionBankItem;
}
