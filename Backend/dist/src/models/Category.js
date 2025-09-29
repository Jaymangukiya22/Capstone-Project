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
exports.Category = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const QuestionBankItem_1 = require("./QuestionBankItem");
const Quiz_1 = require("./Quiz");
let Category = class Category extends sequelize_typescript_1.Model {
};
exports.Category = Category;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Category.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(100)),
    __metadata("design:type", String)
], Category.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], Category.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Category),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Category.prototype, "parentId", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.BOOLEAN,
        defaultValue: true
    }),
    __metadata("design:type", Boolean)
], Category.prototype, "isActive", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Category.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Category.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Category, 'parentId'),
    __metadata("design:type", Category)
], Category.prototype, "parent", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Category, 'parentId'),
    __metadata("design:type", Array)
], Category.prototype, "children", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => QuestionBankItem_1.QuestionBankItem, 'categoryId'),
    __metadata("design:type", Array)
], Category.prototype, "questionBankItems", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Quiz_1.Quiz, 'categoryId'),
    __metadata("design:type", Array)
], Category.prototype, "quizzes", void 0);
exports.Category = Category = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'categories',
        timestamps: true,
    })
], Category);
//# sourceMappingURL=Category.js.map