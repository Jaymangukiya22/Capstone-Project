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
import { Match } from './Match';
import { User } from './User';
import { PlayerStatus } from '../types/enums';

@Table({
  tableName: 'match_players',
  timestamps: true,
  // Backstop for [M10]: one row per (match, user). upsertDbPlayer/endMatch now
  // upsert against this; without it, the per-answer and end-of-match writes
  // raced to INSERT duplicate player rows.
  indexes: [{ unique: true, fields: ['matchId', 'userId'], name: 'match_players_matchid_userid_uq' }],
})
export class MatchPlayer extends Model {
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

  @Default(PlayerStatus.JOINED)
  @Column(DataType.ENUM(...Object.values(PlayerStatus)))
  status!: PlayerStatus;

  @Default(0)
  @Column(DataType.INTEGER)
  score!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  correctAnswers!: number;

  @Column(DataType.INTEGER)
  timeSpent?: number;

  @Column(DataType.DATE)
  joinedAt?: Date;

  @Column(DataType.DATE)
  finishedAt?: Date;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;

  // Associations
  @BelongsTo(() => Match, 'matchId')
  match!: Match;

  @BelongsTo(() => User, 'userId')
  user!: User;
}
