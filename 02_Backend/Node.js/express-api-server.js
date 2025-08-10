/**
 * Express.js REST API Server Demonstration
 * Showcasing middleware, routing, authentication, error handling, and best practices
 * Author: Bodheesh VC
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory database simulation (replace with real database in production)
let users = [
    {
        id: 1,
        name: 'Bodheesh VC',
        email: 'bodheesh@example.com',
        password: '$2a$10$rOzJqZxnTkDg5F5K5F5K5O5K5F5K5F5K5F5K5F5K5F5K5F5K5F5K5', // 'password123'
        role: 'developer',
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        createdAt: new Date('2021-06-15')
    }
];

let projects = [
    {
        id: 1,
        title: 'E-commerce Platform',
        description: 'Full-stack e-commerce solution',
        technologies: ['React', 'Node.js', 'MongoDB'],
        status: 'active',
        assignedTo: [1],
        createdAt: new Date('2024-01-15')
    }
];

// 1. Middleware Setup
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('combined')); // Logging

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// 2. Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

// Role-based authorization middleware
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};

// 3. Validation Middleware
const validateUser = [
    body('name').isLength({ min: 2, max: 50 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('skills').isArray().optional()
];

const validateProject = [
    body('title').isLength({ min: 3, max: 100 }).trim().escape(),
    body('description').isLength({ min: 10, max: 500 }).trim().escape(),
    body('technologies').isArray({ min: 1 }),
    body('status').isIn(['planning', 'active', 'completed', 'on-hold'])
];

// 4. Error Handling Middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.details
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// 5. Utility Functions
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// 6. API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Authentication Routes
app.post('/api/auth/register', validateUser, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, password, skills } = req.body;

        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const newUser = {
            id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            role: 'developer',
            skills: skills || [],
            createdAt: new Date()
        };

        users.push(newUser);

        // Generate token
        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    skills: newUser.skills
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    skills: user.skills
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
});

// User Routes
app.get('/api/users', authenticateToken, authorizeRole(['admin', 'manager']), (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    let filteredUsers = users.map(({ password, ...user }) => user); // Exclude passwords

    // Search functionality
    if (search) {
        filteredUsers = filteredUsers.filter(user => 
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    res.json({
        success: true,
        data: {
            users: paginatedUsers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filteredUsers.length,
                pages: Math.ceil(filteredUsers.length / limit)
            }
        }
    });
});

app.get('/api/users/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    const { password, ...userProfile } = user;
    res.json({
        success: true,
        data: { user: userProfile }
    });
});

app.put('/api/users/profile', authenticateToken, validateUser, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { name, skills } = req.body;
        users[userIndex] = {
            ...users[userIndex],
            name: name || users[userIndex].name,
            skills: skills || users[userIndex].skills,
            updatedAt: new Date()
        };

        const { password, ...updatedUser } = users[userIndex];
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: updatedUser }
        });
    } catch (error) {
        next(error);
    }
});

// Project Routes
app.get('/api/projects', authenticateToken, (req, res) => {
    const { status, assignedTo } = req.query;
    let filteredProjects = [...projects];

    // Filter by status
    if (status) {
        filteredProjects = filteredProjects.filter(p => p.status === status);
    }

    // Filter by assigned user
    if (assignedTo) {
        filteredProjects = filteredProjects.filter(p => 
            p.assignedTo.includes(parseInt(assignedTo))
        );
    }

    res.json({
        success: true,
        data: { projects: filteredProjects }
    });
});

app.post('/api/projects', authenticateToken, authorizeRole(['admin', 'manager']), validateProject, (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { title, description, technologies, status, assignedTo } = req.body;
        const newProject = {
            id: projects.length + 1,
            title,
            description,
            technologies,
            status: status || 'planning',
            assignedTo: assignedTo || [],
            createdAt: new Date(),
            createdBy: req.user.id
        };

        projects.push(newProject);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: { project: newProject }
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
    const projectId = parseInt(req.params.id);
    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found'
        });
    }

    // Check if user has access to this project
    if (!project.assignedTo.includes(req.user.id) && !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    res.json({
        success: true,
        data: { project }
    });
});

// 7. Advanced Middleware Examples

// Request logging middleware
app.use('/api/', (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Response time middleware
app.use('/api/', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`Request to ${req.path} took ${duration}ms`);
    });
    next();
});

// API versioning middleware
app.use('/api/v1/', (req, res, next) => {
    req.apiVersion = 'v1';
    next();
});

// 8. WebSocket Integration with Socket.IO
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
    });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Project collaboration events
    socket.on('join_project', (projectId) => {
        const project = projects.find(p => p.id === parseInt(projectId));
        if (project && project.assignedTo.includes(socket.userId)) {
            socket.join(`project_${projectId}`);
            socket.emit('joined_project', { projectId, message: 'Joined project successfully' });
        }
    });

    socket.on('project_update', (data) => {
        // Broadcast to all users in the project
        socket.to(`project_${data.projectId}`).emit('project_updated', {
            projectId: data.projectId,
            update: data.update,
            updatedBy: socket.userId,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
    });
});

// 9. File Upload Handling
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: req.file.path
        }
    });
});

// 10. Analytics and Metrics Endpoints
app.get('/api/analytics/dashboard', authenticateToken, authorizeRole(['admin', 'manager']), (req, res) => {
    const totalUsers = users.length;
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;

    // Calculate average project completion time
    const completedProjectsWithDates = projects.filter(p => 
        p.status === 'completed' && p.createdAt
    );

    const avgCompletionTime = completedProjectsWithDates.length > 0 
        ? completedProjectsWithDates.reduce((sum, p) => {
            const days = Math.floor((new Date() - new Date(p.createdAt)) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0) / completedProjectsWithDates.length
        : 0;

    res.json({
        success: true,
        data: {
            overview: {
                totalUsers,
                totalProjects,
                activeProjects,
                completedProjects,
                avgCompletionTime: Math.round(avgCompletionTime)
            },
            projectsByStatus: {
                planning: projects.filter(p => p.status === 'planning').length,
                active: activeProjects,
                completed: completedProjects,
                onHold: projects.filter(p => p.status === 'on-hold').length
            }
        }
    });
});

// 11. Error Routes
app.get('/api/test-error', (req, res, next) => {
    const error = new Error('This is a test error');
    error.status = 500;
    next(error);
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path
    });
});

// Apply error handling middleware
app.use(errorHandler);

// 12. Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📝 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
