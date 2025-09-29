import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  CreatedAt,
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
  @Column(DataType.INTEGER)
  quizId!: number;

  @ForeignKey(() => QuestionBankItem)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  questionId!: number;

  @Column(DataType.INTEGER)
  order?: number;

  @CreatedAt
  createdAt!: Date;

  // Associations
  @BelongsTo(() => Quiz, 'quizId')
  quiz!: Quiz;

  @BelongsTo(() => QuestionBankItem, 'questionId')
  question!: QuestionBankItem;
}
