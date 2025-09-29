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
exports.QuizAttemptAnswer = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const QuizAttempt_1 = require("./QuizAttempt");
const QuestionBankItem_1 = require("./QuestionBankItem");
let QuizAttemptAnswer = class QuizAttemptAnswer extends sequelize_typescript_1.Model {
};
exports.QuizAttemptAnswer = QuizAttemptAnswer;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttemptAnswer.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => QuizAttempt_1.QuizAttempt),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttemptAnswer.prototype, "attemptId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => QuestionBankItem_1.QuestionBankItem),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttemptAnswer.prototype, "questionId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.JSON),
    __metadata("design:type", Array)
], QuizAttemptAnswer.prototype, "selectedOptions", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], QuizAttemptAnswer.prototype, "isCorrect", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttemptAnswer.prototype, "timeSpent", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], QuizAttemptAnswer.prototype, "createdAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => QuizAttempt_1.QuizAttempt, 'attemptId'),
    __metadata("design:type", QuizAttempt_1.QuizAttempt)
], QuizAttemptAnswer.prototype, "attempt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => QuestionBankItem_1.QuestionBankItem, 'questionId'),
    __metadata("design:type", QuestionBankItem_1.QuestionBankItem)
], QuizAttemptAnswer.prototype, "question", void 0);
exports.QuizAttemptAnswer = QuizAttemptAnswer = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'quiz_attempt_answers',
        timestamps: true,
    })
], QuizAttemptAnswer);
//# sourceMappingURL=QuizAttemptAnswer.js.map