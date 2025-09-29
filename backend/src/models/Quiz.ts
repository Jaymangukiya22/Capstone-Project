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
import { Category } from './Category';
import { User } from './User';
import { QuizQuestion } from './QuizQuestion';
import { Difficulty } from '../types/enums';

@Table({
  tableName: 'quizzes',
  timestamps: true,
})
export class Quiz extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Column(DataType.STRING(200))
  title!: string;

  @Column(DataType.TEXT)
  description?: string;

  @Default([])
  @Column({
    type: DataType.JSON,
    allowNull: false,
    comment: 'Array of tags for categorizing and searching quizzes'
  })
  tags!: string[];

  @Default(Difficulty.MEDIUM)
  @Column(DataType.ENUM(...Object.values(Difficulty)))
  difficulty!: Difficulty;

  @Column(DataType.INTEGER)
  timeLimit?: number;

  @Column(DataType.INTEGER)
  maxQuestions?: number;

  @ForeignKey(() => Category)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  categoryId!: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  createdById!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @Default(0)
  @Column(DataType.INTEGER)
  popularity!: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations will be defined after all models are loaded
  @BelongsTo(() => Category, 'categoryId')
  category!: Category;

  @BelongsTo(() => User, 'createdById')
  createdBy!: User;

  // Quiz questions association (many-to-many through QuizQuestion)
  @HasMany(() => QuizQuestion, 'quizId')
  quizQuestions!: QuizQuestion[];
}
