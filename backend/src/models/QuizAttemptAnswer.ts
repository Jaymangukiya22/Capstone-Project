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
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { QuizAttempt } from './QuizAttempt';
import { QuestionBankItem } from './QuestionBankItem';
import { QuestionBankOption } from './QuestionBankOption';

@Table({
  tableName: 'quiz_attempt_answers',
  timestamps: true,
})
export class QuizAttemptAnswer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => QuizAttempt)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  attemptId!: number;

  @ForeignKey(() => QuestionBankItem)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  questionId!: number;

  @ForeignKey(() => QuestionBankOption)
  @Column(DataType.INTEGER)
  selectedOptionId?: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isCorrect!: boolean;

  @Column(DataType.INTEGER)
  timeSpent?: number;

  @CreatedAt
  createdAt!: Date;

  // Associations
  @BelongsTo(() => QuizAttempt, 'attemptId')
  attempt!: QuizAttempt;

  @BelongsTo(() => QuestionBankItem, 'questionId')
  question!: QuestionBankItem;

  @BelongsTo(() => QuestionBankOption, 'selectedOptionId')
  selectedOption?: QuestionBankOption;
}
