import { registerAs } from "@nestjs/config";

export default registerAs('jwt', () => ({
    secret: process.env.JWT_SECRET || 'DEFAULT_SECRET_CHANGE_IN_PRODUCTION',
    expiresIn: process.env.JWT_EXPIRES_IN || '2d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'DEFAULT_REFRESH_SECRET_CHANGE_IN_PROUCTION',
    refreshExpiresIn: process.env.JET_REFRESH_EXPIRES_IN || '30d',
    algorithm: 'HS256',
    issuer: 'taskflow_backend',
    audience: 'taskflow_users',
}))