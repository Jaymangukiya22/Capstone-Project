"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerStatus = exports.MatchType = exports.MatchStatus = exports.AttemptStatus = exports.UserRole = exports.Difficulty = void 0;
var Difficulty;
(function (Difficulty) {
    Difficulty["EASY"] = "EASY";
    Difficulty["MEDIUM"] = "MEDIUM";
    Difficulty["HARD"] = "HARD";
})(Difficulty || (exports.Difficulty = Difficulty = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["PLAYER"] = "PLAYER";
})(UserRole || (exports.UserRole = UserRole = {}));
var AttemptStatus;
(function (AttemptStatus) {
    AttemptStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AttemptStatus["COMPLETED"] = "COMPLETED";
    AttemptStatus["ABANDONED"] = "ABANDONED";
})(AttemptStatus || (exports.AttemptStatus = AttemptStatus = {}));
var MatchStatus;
(function (MatchStatus) {
    MatchStatus["WAITING"] = "WAITING";
    MatchStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MatchStatus["COMPLETED"] = "COMPLETED";
    MatchStatus["CANCELLED"] = "CANCELLED";
})(MatchStatus || (exports.MatchStatus = MatchStatus = {}));
var MatchType;
(function (MatchType) {
    MatchType["SOLO"] = "SOLO";
    MatchType["MULTIPLAYER"] = "MULTIPLAYER";
    MatchType["TOURNAMENT"] = "TOURNAMENT";
})(MatchType || (exports.MatchType = MatchType = {}));
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["JOINED"] = "JOINED";
    PlayerStatus["WAITING"] = "WAITING";
    PlayerStatus["READY"] = "READY";
    PlayerStatus["PLAYING"] = "PLAYING";
    PlayerStatus["FINISHED"] = "FINISHED";
    PlayerStatus["DISCONNECTED"] = "DISCONNECTED";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
//# sourceMappingURL=enums.js.map