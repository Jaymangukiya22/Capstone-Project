import { Model } from 'sequelize-typescript';
import { Match } from './Match';
import { User } from './User';
import { PlayerStatus } from '../types/enums';
export declare class MatchPlayer extends Model {
    id: number;
    matchId: number;
    userId: number;
    status: PlayerStatus;
    score: number;
    correctAnswers: number;
    timeSpent?: number;
    joinedAt?: Date;
    finishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    match: Match;
    user: User;
}
//# sourceMappingURL=MatchPlayer.d.ts.map