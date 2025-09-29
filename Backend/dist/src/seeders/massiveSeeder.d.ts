interface SeederConfig {
    users: number;
    categories: number;
    questionsPerCategory: number;
    quizzesPerCategory: number;
    attemptsPerUser: number;
    questionsPerQuiz: number;
}
declare const DEFAULT_CONFIG: SeederConfig;
declare class MassiveSeeder {
    private config;
    constructor(config?: SeederConfig);
    seed(): Promise<void>;
}
export { MassiveSeeder, DEFAULT_CONFIG };
export default MassiveSeeder;
//# sourceMappingURL=massiveSeeder.d.ts.map