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
import { QuestionBankItem } from './QuestionBankItem';

@Table({
  tableName: 'question_bank_options',
  timestamps: true,
})
export class QuestionBankOption extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => QuestionBankItem)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  questionId!: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  optionText!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isCorrect!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => QuestionBankItem, 'questionId')
  question!: QuestionBankItem;
}
