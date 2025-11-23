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
  @Column({ type: DataType.TEXT, field: 'question_text' })
  questionText!: string;

  @Column(DataType.TEXT)
  explanation?: string;

  @ForeignKey(() => Category)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'category_id' })
  categoryId!: number;

  @Default(Difficulty.MEDIUM)
  @Column(DataType.ENUM(...Object.values(Difficulty)))
  difficulty!: Difficulty;

  @Default('MCQ')
  @Column({ type: DataType.STRING(20), field: 'question_type' })
  questionType!: string;

  @Column({ type: DataType.ARRAY(DataType.TEXT), field: 'tags' })
  tags?: string[];

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'usage_count' })
  usageCount!: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'created_by_id' })
  createdById!: number;

  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'is_active' })
  isActive!: boolean;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
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
