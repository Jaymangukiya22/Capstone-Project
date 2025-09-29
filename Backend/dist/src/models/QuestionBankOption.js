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
exports.QuestionBankOption = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const QuestionBankItem_1 = require("./QuestionBankItem");
let QuestionBankOption = class QuestionBankOption extends sequelize_typescript_1.Model {
};
exports.QuestionBankOption = QuestionBankOption;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuestionBankOption.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => QuestionBankItem_1.QuestionBankItem),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], QuestionBankOption.prototype, "questionId", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], QuestionBankOption.prototype, "optionText", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], QuestionBankOption.prototype, "isCorrect", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], QuestionBankOption.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], QuestionBankOption.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => QuestionBankItem_1.QuestionBankItem, 'questionId'),
    __metadata("design:type", QuestionBankItem_1.QuestionBankItem)
], QuestionBankOption.prototype, "question", void 0);
exports.QuestionBankOption = QuestionBankOption = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'question_bank_options',
        timestamps: true,
    })
], QuestionBankOption);
//# sourceMappingURL=QuestionBankOption.js.map