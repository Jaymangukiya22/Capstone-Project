import { Server as HTTPServer } from 'http';
export interface MatchPlayer {
    userId: number;
    username: string;
    socketId: string;
    score: number;
    currentQuestionIndex: number;
    isReady: boolean;
    answers: Array<{
        questionId: number;
        selectedOptions: number[];
        timeSpent: number;
        isCorrect: boolean;
    }>;
}
export interface MatchRoom {
    id: string;
    quizId: number;
    quiz: any;
    players: Map<number, MatchPlayer>;
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
    currentQuestionIndex: number;
    questionStartTime: number;
    maxPlayers: number;
    timeLimit: number;
    questions: any[];
    createdAt: Date;
}
export declare class MatchService {
    private io;
    private matches;
    private userToMatch;
    constructor(server: HTTPServer);
    private setupSocketHandlers;
    private createMatch;
    private findMatchByCode;
    private joinMatch;
    private startMatch;
    private submitAnswer;
    private nextQuestion;
    private endMatch;
    private updateEloRatings;
    private handleDisconnect;
    private startMatchCleanup;
    getActiveMatches(): any[];
    getMatchById(matchId: string): MatchRoom | undefined;
}
export declare let matchService: MatchService;
//# sourceMappingURL=matchService.d.ts.map