import { Server as SocketIOServer } from 'socket.io';
interface MatchPlayer {
    userId: number;
    username: string;
    socketId: string;
    score: number;
    currentQuestionIndex: number;
    isReady: boolean;
    isAI: boolean;
    answers: any[];
    aiOpponent?: {
        id: string;
        name: string;
        difficulty: string;
        avatar: string;
    };
}
interface MatchRoom {
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
    joinCode?: string;
    matchType: 'SOLO' | 'MULTIPLAYER' | 'FRIEND_1V1';
}
export declare class MatchService {
    private io;
    private matches;
    private userToMatch;
    private joinCodeToMatch;
    constructor(io?: SocketIOServer);
    setSocketServer(io: SocketIOServer): void;
    private generateJoinCode;
    private loadQuizQuestions;
    private setupSocketHandlers;
    createSoloMatch(userId: number, quizId: number, aiOpponentId?: string): Promise<string>;
    createMatch(quizId: number, userId: number, maxPlayers?: number): Promise<{
        matchId: string;
        joinCode: string;
    }>;
    createFriendMatch(quizId: number, userId: number): Promise<{
        matchId: string;
        joinCode: string;
    }>;
    joinMatch(matchId: string, userId: number, socketId: string): Promise<boolean>;
    private startMatch;
    private submitAnswer;
    private nextQuestion;
    private endMatch;
    private startAIResponseTimer;
    getMatchById(matchId: string): MatchRoom | undefined;
    getAvailableMatches(): Array<{
        id: string;
        quizId: number;
        quiz: any;
        playerCount: number;
        maxPlayers: number;
        status: string;
        createdAt: Date;
    }>;
    getActiveMatches(): Array<{
        id: string;
        quizId: number;
        quiz: any;
        playerCount: number;
        maxPlayers: number;
        status: string;
        createdAt: Date;
    }>;
}
export declare const matchService: MatchService;
export {};
//# sourceMappingURL=matchService.d.ts.map