import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  HasMany,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { QuestionBankItem } from './QuestionBankItem';
import { Quiz } from './Quiz';

@Table({
  tableName: 'categories',
  timestamps: true,
})
export class Category extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  name!: string;

  @Column(DataType.TEXT)
  description?: string;

  @ForeignKey(() => Category)
  @Column(DataType.INTEGER)
  parentId?: number;

  @AllowNull(false)
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  isActive!: boolean;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Self-referencing associations for nested categories
  @BelongsTo(() => Category, 'parentId')
  parent?: Category;

  @HasMany(() => Category, 'parentId')
  children!: Category[];

  // Other associations
  @HasMany(() => QuestionBankItem, 'categoryId')
  questionBankItems!: QuestionBankItem[];

  @HasMany(() => Quiz, 'categoryId')
  quizzes!: Quiz[];
}
