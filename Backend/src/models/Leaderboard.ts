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
import { User } from './User';
import { Category } from './Category';

@Table({
  tableName: 'leaderboards',
  timestamps: true,
})
export class Leaderboard extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, field: 'user_id' })
  userId?: number;

  @ForeignKey(() => Category)
  @Column({ type: DataType.INTEGER, field: 'category_id' })
  categoryId?: number;

  @Default(1200)
  @Column({ type: DataType.INTEGER, field: 'elo_rating' })
  eloRating!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'total_matches' })
  totalMatches!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  wins!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  losses!: number;

  @Default(0.00)
  @Column({ type: DataType.DECIMAL(5,2), field: 'win_rate' })
  winRate!: number;

  @Default(0.00)
  @Column({ type: DataType.DECIMAL(8,2), field: 'avg_score' })
  avgScore!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'best_streak' })
  bestStreak!: number;

  @Default(0)
  @Column({ type: DataType.INTEGER, field: 'current_streak' })
  currentStreak!: number;

  @Column({ type: DataType.DATE, field: 'last_match_at' })
  lastMatchAt?: Date;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => User, 'userId')
  user?: User;

  @BelongsTo(() => Category, 'categoryId')
  category?: Category;
}
