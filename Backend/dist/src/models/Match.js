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
exports.Match = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const MatchPlayer_1 = require("./MatchPlayer");
const Quiz_1 = require("./Quiz");
const enums_1 = require("../types/enums");
let Match = class Match extends sequelize_typescript_1.Model {
};
exports.Match = Match;
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Match.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(50)),
    __metadata("design:type", String)
], Match.prototype, "matchId", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Quiz_1.Quiz),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Match.prototype, "quizId", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(enums_1.MatchType.MULTIPLAYER),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(enums_1.MatchType))),
    __metadata("design:type", String)
], Match.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(enums_1.MatchStatus.WAITING),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(enums_1.MatchStatus))),
    __metadata("design:type", String)
], Match.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(2),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Match.prototype, "maxPlayers", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], Match.prototype, "startedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE),
    __metadata("design:type", Date)
], Match.prototype, "endedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER),
    __metadata("design:type", Number)
], Match.prototype, "winnerId", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Match.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Match.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Quiz_1.Quiz, 'quizId'),
    __metadata("design:type", Quiz_1.Quiz)
], Match.prototype, "quiz", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => MatchPlayer_1.MatchPlayer, 'matchId'),
    __metadata("design:type", Array)
], Match.prototype, "players", void 0);
exports.Match = Match = __decorate([
    (0, sequelize_typescript_1.Table)({
        tableName: 'matches',
        timestamps: true,
    })
], Match);
//# sourceMappingURL=Match.js.map