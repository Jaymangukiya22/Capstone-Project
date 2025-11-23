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
  @Column({ type: DataType.INTEGER, field: 'parent_id' })
  parentId?: number;

  @Column({ type: DataType.INTEGER, field: 'level' })
  level?: number;

  @Column({ type: DataType.STRING(500), field: 'path' })
  path?: string;

  @AllowNull(false)
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  })
  isActive!: boolean;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
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
