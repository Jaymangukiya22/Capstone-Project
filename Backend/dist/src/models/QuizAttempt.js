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
exports.QuizAttempt = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = require("./User");
const Quiz_1 = require("./Quiz");
const QuizAttemptAnswer_1 = require("./QuizAttemptAnswer");
const enums_1 = require("../types/enums");
let QuizAttempt = class QuizAttempt extends sequelize_typescript_1.Model {
};
exports.QuizAttempt = QuizAttempt;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttempt.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User_1.User),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttempt.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Quiz_1.Quiz),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttempt.prototype, "quizId", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(enums_1.AttemptStatus.IN_PROGRESS),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(enums_1.AttemptStatus))),
    __metadata("design:type", String)
], QuizAttempt.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttempt.prototype, "score", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttempt.prototype, "totalQuestions", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttempt.prototype, "correctAnswers", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuizAttempt.prototype, "timeSpent", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], QuizAttempt.prototype, "startedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], QuizAttempt.prototype, "completedAt", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], QuizAttempt.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], QuizAttempt.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User_1.User, 'userId'),
    __metadata("design:type", User_1.User)
], QuizAttempt.prototype, "user", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Quiz_1.Quiz, 'quizId'),
    __metadata("design:type", Quiz_1.Quiz)
], QuizAttempt.prototype, "quiz", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => QuizAttemptAnswer_1.QuizAttemptAnswer, 'attemptId'),
    __metadata("design:type", Array)
], QuizAttempt.prototype, "answers", void 0);
exports.QuizAttempt = QuizAttempt = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'quiz_attempts',
        timestamps: true,
    })
], QuizAttempt);
//# sourceMappingURL=QuizAttempt.js.map