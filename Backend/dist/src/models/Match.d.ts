import { Model } from 'sequelize-typescript';
import { MatchPlayer } from './MatchPlayer';
import { Quiz } from './Quiz';
import { MatchStatus, MatchType } from '../types/enums';
export declare class Match extends Model {
    id: number;
    matchId: string;
    quizId?: number;
    type: MatchType;
    status: MatchStatus;
    maxPlayers: number;
    startedAt?: Date;
    endedAt?: Date;
    winnerId?: number;
    createdAt: Date;
    updatedAt: Date;
    quiz?: Quiz;
    players: MatchPlayer[];
}
//# sourceMappingURL=Match.d.ts.map