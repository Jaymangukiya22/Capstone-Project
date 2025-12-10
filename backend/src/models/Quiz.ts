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
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: false,
    field: 'tags',
    comment: 'Array of tags for categorizing and searching quizzes'
  })
  tags!: string[];

  @Default(Difficulty.MEDIUM)
  @Column(DataType.ENUM(...Object.values(Difficulty)))
  difficulty!: Difficulty;

  @Default(30)
  @Column({ type: DataType.INTEGER, field: 'time_limit' })
  timeLimit!: number;

  @Default(3)
  @Column({ type: DataType.INTEGER, field: 'max_questions' })
  maxQuestions!: number;

  @ForeignKey(() => Category)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'category_id' })
  categoryId!: number;

  @Default(100)
  @Column({ type: DataType.INTEGER, field: 'points_per_question' })
  pointsPerQuestion!: number;

  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'time_bonus_enabled' })
  timeBonusEnabled!: boolean;

  @Default(50)
  @Column({ type: DataType.INTEGER, field: 'max_time_bonus' })
  maxTimeBonus!: number;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'negative_marking' })
  negativeMarking!: boolean;

  @Default(25)
  @Column({ type: DataType.INTEGER, field: 'negative_points' })
  negativePoints!: number;

  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'shuffle_questions' })
  shuffleQuestions!: boolean;

  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'shuffle_options' })
  shuffleOptions!: boolean;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'is_published' })
  isPublished!: boolean;

  @Default(true)
  @Column({ type: DataType.BOOLEAN, field: 'is_active' })
  isActive!: boolean;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'popularity' })
  popularity!: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER, field: 'created_by_id' })
  createdById!: number;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
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
