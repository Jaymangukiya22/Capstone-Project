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
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Match } from './Match';
import { User } from './User';

@Table({
  tableName: 'match_answers',
  timestamps: true,
})
export class MatchAnswer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => Match)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  matchId!: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  userId!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  questionId!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  questionIndex!: number;

  @AllowNull(false)
  @Column(DataType.JSONB)
  selectedOptions!: number[];

  @AllowNull(false)
  @Column(DataType.JSONB)
  correctOptions!: number[];

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  isCorrect!: boolean;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  timeSpent!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  points!: number;

  @Column(DataType.DATE)
  submittedAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  @BelongsTo(() => Match, 'matchId')
  match!: Match;

  @BelongsTo(() => User, 'userId')
  user!: User;
}
