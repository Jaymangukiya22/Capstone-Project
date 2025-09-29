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
exports.Quiz = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Category_1 = require("./Category");
const User_1 = require("./User");
const QuizQuestion_1 = require("./QuizQuestion");
const enums_1 = require("../types/enums");
let Quiz = class Quiz extends sequelize_typescript_1.Model {
};
exports.Quiz = Quiz;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Quiz.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(200)),
    __metadata("design:type", String)
], Quiz.prototype, "title", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], Quiz.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(enums_1.Difficulty.MEDIUM),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(enums_1.Difficulty))),
    __metadata("design:type", String)
], Quiz.prototype, "difficulty", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Quiz.prototype, "timeLimit", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Quiz.prototype, "maxQuestions", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Category_1.Category),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Quiz.prototype, "categoryId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User_1.User),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Quiz.prototype, "createdById", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], Quiz.prototype, "isActive", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Quiz.prototype, "popularity", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Quiz.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Quiz.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Category_1.Category, 'categoryId'),
    __metadata("design:type", Category_1.Category)
], Quiz.prototype, "category", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User_1.User, 'createdById'),
    __metadata("design:type", User_1.User)
], Quiz.prototype, "createdBy", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => QuizQuestion_1.QuizQuestion, 'quizId'),
    __metadata("design:type", Array)
], Quiz.prototype, "quizQuestions", void 0);
exports.Quiz = Quiz = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'quizzes',
        timestamps: true,
    })
], Quiz);
//# sourceMappingURL=Quiz.js.map