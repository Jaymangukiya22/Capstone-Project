"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
router.get('/users', adminController_1.adminController.getAllUsers.bind(adminController_1.adminController));
router.put('/users/:id/status', adminController_1.adminController.updateUserStatus.bind(adminController_1.adminController));
router.delete('/users/:id', adminController_1.adminController.deleteUser.bind(adminController_1.adminController));
router.get('/stats', adminController_1.adminController.getSystemStats.bind(adminController_1.adminController));
router.post('/seed', adminController_1.adminController.seedDatabase.bind(adminController_1.adminController));
router.delete('/clear-db', adminController_1.adminController.clearDatabase.bind(adminController_1.adminController));
router.get('/health', adminController_1.adminController.getSystemHealth.bind(adminController_1.adminController));
router.get('/logs', adminController_1.adminController.getSystemLogs.bind(adminController_1.adminController));
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map