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
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { MatchPlayer } from './MatchPlayer';
import { Quiz } from './Quiz';
import { MatchStatus, MatchType } from '../types/enums';

@Table({
  tableName: 'matches',
  timestamps: true,
})
export class Match extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @AllowNull(false)
  @Column(DataType.STRING(50))
  matchId!: string;

  @ForeignKey(() => Quiz)
  @Column(DataType.INTEGER)
  quizId?: number;

  @Default(MatchType.MULTIPLAYER)
  @Column(DataType.ENUM(...Object.values(MatchType)))
  type!: MatchType;

  @Default(MatchStatus.WAITING)
  @Column(DataType.ENUM(...Object.values(MatchStatus)))
  status!: MatchStatus;

  @Default(2)
  @Column(DataType.INTEGER)
  maxPlayers!: number;

  @Column(DataType.DATE)
  startedAt?: Date;

  @Column(DataType.DATE)
  endedAt?: Date;

  @Column(DataType.INTEGER)
  winnerId?: number;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => Quiz, 'quizId')
  quiz?: Quiz;

  @HasMany(() => MatchPlayer, 'matchId')
  players!: MatchPlayer[];
}
