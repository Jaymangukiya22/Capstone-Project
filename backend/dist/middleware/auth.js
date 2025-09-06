"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicAuth = void 0;
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Basic authentication required'
        });
        return;
    }
    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        const validUsername = process.env.BASIC_AUTH_USERNAME || 'aryan';
        const validPassword = process.env.BASIC_AUTH_PASSWORD || 'admin';
        if (username === validUsername && password === validPassword) {
            req.user = {
                username,
                role: 'admin'
            };
            next();
        }
        else {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials'
            });
            return;
        }
    }
    catch (error) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid authorization header'
        });
        return;
    }
};
exports.basicAuth = basicAuth;
//# sourceMappingURL=auth.js.map