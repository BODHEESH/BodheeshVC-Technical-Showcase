/**
 * JWT Authentication System
 * Demonstrating token-based authentication, authorization, and security
 * Author: Bodheesh VC
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class JWTAuthenticationService {
    constructor(options = {}) {
        this.accessTokenSecret = options.accessTokenSecret || process.env.JWT_ACCESS_SECRET || 'access-secret';
        this.refreshTokenSecret = options.refreshTokenSecret || process.env.JWT_REFRESH_SECRET || 'refresh-secret';
        this.accessTokenExpiry = options.accessTokenExpiry || '15m';
        this.refreshTokenExpiry = options.refreshTokenExpiry || '7d';
        this.issuer = options.issuer || 'bodheesh-portfolio';
        this.audience = options.audience || 'portfolio-users';
        
        // In-memory storage (use Redis in production)
        this.refreshTokens = new Set();
        this.blacklistedTokens = new Set();
        this.users = new Map();
        
        this.initializeSampleUsers();
    }

    // 1. User Management
    initializeSampleUsers() {
        const sampleUsers = [
            {
                id: '1',
                username: 'bodheesh',
                email: 'bodheesh@example.com',
                password: 'password123',
                role: 'admin',
                permissions: ['read', 'write', 'delete', 'admin'],
                profile: {
                    name: 'Bodheesh VC',
                    skills: ['JavaScript', 'React', 'Node.js'],
                    department: 'Engineering'
                }
            },
            {
                id: '2',
                username: 'alice',
                email: 'alice@example.com',
                password: 'password123',
                role: 'developer',
                permissions: ['read', 'write'],
                profile: {
                    name: 'Alice Johnson',
                    skills: ['Java', 'Spring', 'AWS'],
                    department: 'Engineering'
                }
            }
        ];

        sampleUsers.forEach(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            this.users.set(user.id, {
                ...user,
                password: hashedPassword,
                createdAt: new Date(),
                lastLogin: null,
                loginAttempts: 0,
                isLocked: false
            });
        });
    }

    // 2. Token Generation
    generateAccessToken(payload) {
        const tokenPayload = {
            ...payload,
            type: 'access',
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomUUID() // Unique token ID
        };

        return jwt.sign(tokenPayload, this.accessTokenSecret, {
            expiresIn: this.accessTokenExpiry,
            issuer: this.issuer,
            audience: this.audience,
            algorithm: 'HS256'
        });
    }

    generateRefreshToken(payload) {
        const tokenPayload = {
            ...payload,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomUUID()
        };

        const token = jwt.sign(tokenPayload, this.refreshTokenSecret, {
            expiresIn: this.refreshTokenExpiry,
            issuer: this.issuer,
            audience: this.audience,
            algorithm: 'HS256'
        });

        // Store refresh token
        this.refreshTokens.add(token);
        return token;
    }

    // 3. Token Verification
    verifyAccessToken(token) {
        try {
            if (this.blacklistedTokens.has(token)) {
                throw new Error('Token has been revoked');
            }

            const decoded = jwt.verify(token, this.accessTokenSecret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: ['HS256']
            });

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return { success: true, payload: decoded };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    verifyRefreshToken(token) {
        try {
            if (!this.refreshTokens.has(token)) {
                throw new Error('Refresh token not found');
            }

            const decoded = jwt.verify(token, this.refreshTokenSecret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: ['HS256']
            });

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return { success: true, payload: decoded };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 4. Authentication Methods
    async authenticateUser(email, password) {
        try {
            // Find user by email
            const user = Array.from(this.users.values()).find(u => u.email === email);
            
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check if account is locked
            if (user.isLocked) {
                throw new Error('Account is locked due to multiple failed login attempts');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                // Increment login attempts
                user.loginAttempts++;
                if (user.loginAttempts >= 5) {
                    user.isLocked = true;
                    setTimeout(() => {
                        user.isLocked = false;
                        user.loginAttempts = 0;
                    }, 30 * 60 * 1000); // Lock for 30 minutes
                }
                throw new Error('Invalid credentials');
            }

            // Reset login attempts on successful login
            user.loginAttempts = 0;
            user.lastLogin = new Date();

            // Generate tokens
            const tokenPayload = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            };

            const accessToken = this.generateAccessToken(tokenPayload);
            const refreshToken = this.generateRefreshToken({ id: user.id });

            return {
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        profile: user.profile
                    },
                    tokens: {
                        accessToken,
                        refreshToken,
                        expiresIn: this.accessTokenExpiry
                    }
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 5. Token Refresh
    async refreshAccessToken(refreshToken) {
        try {
            const verification = this.verifyRefreshToken(refreshToken);
            
            if (!verification.success) {
                throw new Error(verification.error);
            }

            const user = this.users.get(verification.payload.id);
            if (!user) {
                throw new Error('User not found');
            }

            // Generate new access token
            const tokenPayload = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            };

            const newAccessToken = this.generateAccessToken(tokenPayload);

            return {
                success: true,
                data: {
                    accessToken: newAccessToken,
                    expiresIn: this.accessTokenExpiry
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 6. Token Revocation
    revokeToken(token) {
        this.blacklistedTokens.add(token);
        return { success: true, message: 'Token revoked successfully' };
    }

    revokeRefreshToken(refreshToken) {
        const removed = this.refreshTokens.delete(refreshToken);
        return { 
            success: removed, 
            message: removed ? 'Refresh token revoked' : 'Refresh token not found' 
        };
    }

    // 7. Authorization Middleware
    requireAuth() {
        return (req, res, next) => {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Access token required'
                });
            }

            const verification = this.verifyAccessToken(token);
            if (!verification.success) {
                return res.status(403).json({
                    success: false,
                    message: verification.error
                });
            }

            req.user = verification.payload;
            next();
        };
    }

    requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userRoles = Array.isArray(roles) ? roles : [roles];
            if (!userRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            next();
        };
    }

    requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user || !req.user.permissions.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    message: `Permission '${permission}' required`
                });
            }
            next();
        };
    }

    // 8. Security Features
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    hashSensitiveData(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // 9. Session Management
    createSession(userId, deviceInfo = {}) {
        const sessionId = crypto.randomUUID();
        const session = {
            id: sessionId,
            userId,
            deviceInfo,
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true
        };

        // Store session (use Redis in production)
        return session;
    }

    // 10. Cleanup expired tokens
    cleanupExpiredTokens() {
        const now = Date.now() / 1000;
        
        // Clean blacklisted tokens (check if they're expired)
        for (const token of this.blacklistedTokens) {
            try {
                jwt.verify(token, this.accessTokenSecret, { ignoreExpiration: false });
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    this.blacklistedTokens.delete(token);
                }
            }
        }

        // Clean refresh tokens
        for (const token of this.refreshTokens) {
            try {
                jwt.verify(token, this.refreshTokenSecret, { ignoreExpiration: false });
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    this.refreshTokens.delete(token);
                }
            }
        }

        console.log('🧹 Expired tokens cleaned up');
    }
}

// 11. Express.js Integration Example
const express = require('express');
const app = express();

app.use(express.json());

// Initialize JWT service
const jwtService = new JWTAuthenticationService({
    accessTokenSecret: 'your-super-secret-access-key',
    refreshTokenSecret: 'your-super-secret-refresh-key',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d'
});

// Authentication routes
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await jwtService.authenticateUser(email, password);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(401).json(result);
    }
});

app.post('/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    const result = await jwtService.refreshAccessToken(refreshToken);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(403).json(result);
    }
});

app.post('/auth/logout', jwtService.requireAuth(), (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    jwtService.revokeToken(token);
    
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Protected routes
app.get('/profile', jwtService.requireAuth(), (req, res) => {
    res.json({
        success: true,
        data: { user: req.user }
    });
});

app.get('/admin/users', 
    jwtService.requireAuth(), 
    jwtService.requireRole('admin'), 
    (req, res) => {
        const users = Array.from(jwtService.users.values()).map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
        }));
        
        res.json({
            success: true,
            data: { users }
        });
    }
);

// Cleanup expired tokens every hour
setInterval(() => {
    jwtService.cleanupExpiredTokens();
}, 60 * 60 * 1000);

module.exports = { JWTAuthenticationService, app };
