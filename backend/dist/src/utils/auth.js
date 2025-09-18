"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateToken = exports.comparePassword = exports.hashPassword = exports.UserRole = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["PLAYER"] = "PLAYER";
})(UserRole || (exports.UserRole = UserRole = {}));
const hashPassword = async (password) => {
    const saltRounds = 12;
    return bcryptjs_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
const generateToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};
exports.generateToken = generateToken;
const generateRefreshToken = (userId) => {
    const jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_REFRESH_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign({ userId }, jwtSecret, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token) => {
    const jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_REFRESH_SECRET not configured');
    }
    return jsonwebtoken_1.default.verify(token, jwtSecret);
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=auth.js.map