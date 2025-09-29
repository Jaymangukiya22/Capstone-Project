"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizQuestion = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Quiz_1 = require("./Quiz");
const QuestionBankItem_1 = require("./QuestionBankItem");
let QuizQuestion = class QuizQuestion extends sequelize_typescript_1.Model {
};
exports.QuizQuestion = QuizQuestion;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizQuestion.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Quiz_1.Quiz),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizQuestion.prototype, "quizId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => QuestionBankItem_1.QuestionBankItem),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizQuestion.prototype, "questionId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizQuestion.prototype, "order", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], QuizQuestion.prototype, "createdAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Quiz_1.Quiz, 'quizId'),
    __metadata("design:type", Quiz_1.Quiz)
], QuizQuestion.prototype, "quiz", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => QuestionBankItem_1.QuestionBankItem, 'questionId'),
    __metadata("design:type", QuestionBankItem_1.QuestionBankItem)
], QuizQuestion.prototype, "question", void 0);
exports.QuizQuestion = QuizQuestion = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'quiz_questions',
        timestamps: true,
    })
], QuizQuestion);
//# sourceMappingURL=QuizQuestion.js.map