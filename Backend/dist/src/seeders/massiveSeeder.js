"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.MassiveSeeder = void 0;
const engineeringSeeder_1 = require("../scripts/engineeringSeeder");
const logger_1 = require("../utils/logger");
const DEFAULT_CONFIG = {
    users: 2,
    categories: 9,
    questionsPerCategory: 5,
    quizzesPerCategory: 1,
    attemptsPerUser: 0,
    questionsPerQuiz: 5
};
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
class MassiveSeeder {
    constructor(config = DEFAULT_CONFIG) {
        this.config = config;
    }
    async seed() {
        try {
            (0, logger_1.logInfo)('🚀 Starting Engineering database seeding via MassiveSeeder...', this.config);
            const engineeringSeeder = new engineeringSeeder_1.EngineeringSeeder();
            await engineeringSeeder.run();
            (0, logger_1.logInfo)('✅ Engineering database seeding completed successfully via MassiveSeeder');
        }
        catch (error) {
            (0, logger_1.logError)('❌ Engineering seeding failed via MassiveSeeder', error);
            throw error;
        }
    }
}
exports.MassiveSeeder = MassiveSeeder;
exports.default = MassiveSeeder;
//# sourceMappingURL=massiveSeeder.js.map