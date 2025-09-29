declare class EnhancedMatchService {
    private io;
    private matches;
    private userToMatch;
    private joinCodeToMatch;
    constructor(server: any);
    private generateJoinCode;
    private loadQuizQuestions;
    private setupSocketHandlers;
    private startMatch;
    private nextQuestion;
    private endMatch;
}
declare let enhancedMatchService: EnhancedMatchService;
export { enhancedMatchService };
//# sourceMappingURL=matchServer-enhanced.d.ts.map