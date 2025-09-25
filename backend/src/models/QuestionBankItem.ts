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
import { Category } from './Category';
import { QuestionBankOption } from './QuestionBankOption';
import { QuizQuestion } from './QuizQuestion';
import { Difficulty } from '../types/enums';

@Table({
  tableName: 'question_bank_items',
  timestamps: true,
})
export class QuestionBankItem extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  questionText!: string;

  @ForeignKey(() => Category)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  categoryId!: number;

  @Default(Difficulty.MEDIUM)
  @Column(DataType.ENUM(...Object.values(Difficulty)))
  difficulty!: Difficulty;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  createdById!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => Category, 'categoryId')
  category!: Category;

  @BelongsTo(() => User, 'createdById')
  createdBy!: User;

  @HasMany(() => QuestionBankOption, 'questionId')
  options!: QuestionBankOption[];

  @HasMany(() => QuizQuestion, 'questionId')
  quizQuestions!: QuizQuestion[];
}

// Re-export the Difficulty enum for convenience
export { Difficulty } from '../types/enums';
