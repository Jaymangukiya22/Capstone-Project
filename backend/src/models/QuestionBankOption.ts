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
  @Column({ type: DataType.INTEGER, field: 'question_id' })
  questionId!: number;

  @AllowNull(false)
  @Column({ type: DataType.TEXT, field: 'option_text' })
  optionText!: string;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'is_correct' })
  isCorrect!: boolean;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => QuestionBankItem, 'questionId')
  question!: QuestionBankItem;
}
