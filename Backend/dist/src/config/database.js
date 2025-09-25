"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = exports.connectDatabase = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = require("../models/User");
const Category_1 = require("../models/Category");
const QuestionBankItem_1 = require("../models/QuestionBankItem");
const QuestionBankOption_1 = require("../models/QuestionBankOption");
const Quiz_1 = require("../models/Quiz");
const QuizQuestion_1 = require("../models/QuizQuestion");
const QuizAttempt_1 = require("../models/QuizAttempt");
const QuizAttemptAnswer_1 = require("../models/QuizAttemptAnswer");
const Match_1 = require("../models/Match");
const MatchPlayer_1 = require("../models/MatchPlayer");
const logger_1 = require("../utils/logger");
const dotenv_1 = require("dotenv");
dotenv_1.default.config();
const sequelize = new sequelize_typescript_1.Sequelize({
    database: process.env.DB_NAME || 'quiz_app',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    models: [
        User_1.User,
        Category_1.Category,
        QuestionBankItem_1.QuestionBankItem,
        QuestionBankOption_1.QuestionBankOption,
        Quiz_1.Quiz,
        QuizQuestion_1.QuizQuestion,
        QuizAttempt_1.QuizAttempt,
        QuizAttemptAnswer_1.QuizAttemptAnswer,
        Match_1.Match,
        MatchPlayer_1.MatchPlayer
    ],
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});
exports.sequelize = sequelize;
const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        (0, logger_1.logInfo)('Database connection established successfully');
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ force: true });
            (0, logger_1.logInfo)('Database models synchronized with force: true - tables recreated');
            try {
                const EngineeringSeeder = await Promise.resolve().then(() => require('../scripts/engineeringSeeder'));
                const seeder = new EngineeringSeeder.EngineeringSeeder();
                await seeder.run();
                (0, logger_1.logInfo)('Engineering database seeded successfully');
            }
            catch (seedError) {
                (0, logger_1.logError)('Error seeding engineering database', seedError);
            }
        }
        else {
            (0, logger_1.logInfo)('Database sync skipped - using existing schema');
        }
    }
    catch (error) {
        (0, logger_1.logError)('Unable to connect to database', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
exports.default = sequelize;
//# sourceMappingURL=database.js.map