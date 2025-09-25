"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../utils/validation");
const router = (0, express_1.Router)();
router.post('/register', (0, validation_1.validateRequest)(validation_2.registerSchema), authController_1.register);
router.post('/login', (0, validation_1.validateRequest)(validation_2.loginSchema), authController_1.login);
router.post('/refresh', (0, validation_1.validateRequest)(validation_2.refreshTokenSchema), authController_1.refreshToken);
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
router.put('/profile', auth_1.authenticateToken, (0, validation_1.validateRequest)(validation_2.updateProfileSchema), authController_1.updateProfile);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map