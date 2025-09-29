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
exports.MatchPlayer = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const Match_1 = require("./Match");
const User_1 = require("./User");
const enums_1 = require("../types/enums");
let MatchPlayer = class MatchPlayer extends sequelize_typescript_1.Model {
};
exports.MatchPlayer = MatchPlayer;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Match_1.Match),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "matchId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => User_1.User),
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "userId", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(enums_1.PlayerStatus.JOINED),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(enums_1.PlayerStatus))),
    __metadata("design:type", String)
], MatchPlayer.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "score", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "correctAnswers", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "timeSpent", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MatchPlayer.prototype, "joinedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], MatchPlayer.prototype, "finishedAt", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], MatchPlayer.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], MatchPlayer.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Match_1.Match, 'matchId'),
    __metadata("design:type", Match_1.Match)
], MatchPlayer.prototype, "match", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => User_1.User, 'userId'),
    __metadata("design:type", User_1.User)
], MatchPlayer.prototype, "user", void 0);
exports.MatchPlayer = MatchPlayer = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'match_players',
        timestamps: true,
    })
], MatchPlayer);
//# sourceMappingURL=MatchPlayer.js.map