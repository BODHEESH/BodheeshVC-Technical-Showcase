/**
 * MySQL Database Operations
 * Demonstrating advanced MySQL features with Node.js
 * Author: Bodheesh VC
 */

const mysql = require('mysql2/promise');

class MySQLService {
    constructor(config = {}) {
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 3306,
            user: config.user || 'root',
            password: config.password || process.env.MYSQL_PASSWORD,
            database: config.database || 'portfolio_db',
            connectionLimit: config.connectionLimit || 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        };
        
        this.pool = null;
    }

    // 1. Connection Pool Management
    async connect() {
        try {
            this.pool = mysql.createPool(this.config);
            
            // Test connection
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();
            
            console.log('✅ Connected to MySQL database');
            await this.initializeDatabase();
            
        } catch (error) {
            console.error('❌ MySQL connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Disconnected from MySQL');
        }
    }

    // 2. Database Schema Initialization
    async initializeDatabase() {
        const createTables = `
            -- Users table with indexes
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'developer', 'user') DEFAULT 'user',
                profile JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                
                INDEX idx_email (email),
                INDEX idx_role (role),
                INDEX idx_created_at (created_at),
                FULLTEXT INDEX idx_profile_search (username, email)
            ) ENGINE=InnoDB;

            -- Projects table with foreign keys
            CREATE TABLE IF NOT EXISTS projects (
                id VARCHAR(36) PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                status ENUM('planning', 'in-progress', 'testing', 'completed', 'on-hold') DEFAULT 'planning',
                budget DECIMAL(10,2),
                estimated_hours INT,
                actual_hours INT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deadline DATE,
                
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_status (status),
                INDEX idx_created_by (created_by),
                INDEX idx_deadline (deadline)
            ) ENGINE=InnoDB;

            -- Skills table for many-to-many relationship
            CREATE TABLE IF NOT EXISTS skills (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                category ENUM('frontend', 'backend', 'database', 'devops', 'design') NOT NULL,
                description TEXT,
                
                INDEX idx_category (category)
            ) ENGINE=InnoDB;

            -- User skills junction table
            CREATE TABLE IF NOT EXISTS user_skills (
                user_id INT,
                skill_id INT,
                proficiency TINYINT CHECK (proficiency BETWEEN 1 AND 5),
                years_experience DECIMAL(3,1),
                last_used DATE,
                
                PRIMARY KEY (user_id, skill_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
                INDEX idx_proficiency (proficiency)
            ) ENGINE=InnoDB;

            -- Project assignments
            CREATE TABLE IF NOT EXISTS project_assignments (
                project_id VARCHAR(36),
                user_id INT,
                role VARCHAR(50) DEFAULT 'developer',
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                PRIMARY KEY (project_id, user_id),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;

            -- Activity logs for audit trail
            CREATE TABLE IF NOT EXISTS activity_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(50),
                resource_id VARCHAR(100),
                details JSON,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_action (user_id, action),
                INDEX idx_created_at (created_at),
                INDEX idx_resource (resource_type, resource_id)
            ) ENGINE=InnoDB;
        `;

        try {
            await this.pool.execute(createTables);
            console.log('📋 Database schema initialized');
            await this.seedSampleData();
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    // 3. Advanced CRUD Operations
    async createUser(userData) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Insert user
            const [userResult] = await connection.execute(
                `INSERT INTO users (username, email, password_hash, role, profile) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    userData.username,
                    userData.email,
                    userData.passwordHash,
                    userData.role,
                    JSON.stringify(userData.profile)
                ]
            );

            const userId = userResult.insertId;

            // Insert user skills
            if (userData.skills && userData.skills.length > 0) {
                const skillValues = userData.skills.map(skill => [
                    userId,
                    skill.skillId,
                    skill.proficiency,
                    skill.yearsExperience
                ]);

                await connection.execute(
                    `INSERT INTO user_skills (user_id, skill_id, proficiency, years_experience) 
                     VALUES ${skillValues.map(() => '(?, ?, ?, ?)').join(', ')}`,
                    skillValues.flat()
                );
            }

            await connection.commit();
            console.log(`✅ User created with ID: ${userId}`);
            
            return { success: true, userId };

        } catch (error) {
            await connection.rollback();
            console.error('❌ Failed to create user:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // 4. Complex Queries with Joins
    async getUsersWithSkills(filters = {}) {
        const whereConditions = [];
        const params = [];

        if (filters.role) {
            whereConditions.push('u.role = ?');
            params.push(filters.role);
        }

        if (filters.skillCategory) {
            whereConditions.push('s.category = ?');
            params.push(filters.skillCategory);
        }

        if (filters.minProficiency) {
            whereConditions.push('us.proficiency >= ?');
            params.push(filters.minProficiency);
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const query = `
            SELECT 
                u.id,
                u.username,
                u.email,
                u.role,
                u.profile,
                u.created_at,
                u.last_login,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'skill_name', s.name,
                        'category', s.category,
                        'proficiency', us.proficiency,
                        'years_experience', us.years_experience,
                        'last_used', us.last_used
                    )
                ) as skills
            FROM users u
            LEFT JOIN user_skills us ON u.id = us.user_id
            LEFT JOIN skills s ON us.skill_id = s.id
            ${whereClause}
            GROUP BY u.id, u.username, u.email, u.role, u.profile, u.created_at, u.last_login
            ORDER BY u.created_at DESC
        `;

        try {
            const [rows] = await this.pool.execute(query, params);
            return { success: true, data: rows };
        } catch (error) {
            console.error('❌ Failed to fetch users with skills:', error);
            throw error;
        }
    }

    // 5. Stored Procedures
    async createStoredProcedures() {
        const procedures = [
            `
            DROP PROCEDURE IF EXISTS GetProjectStatistics;
            CREATE PROCEDURE GetProjectStatistics(IN user_id INT)
            BEGIN
                SELECT 
                    COUNT(*) as total_projects,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
                    SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as active_projects,
                    AVG(actual_hours) as avg_hours_per_project,
                    SUM(budget) as total_budget
                FROM projects p
                JOIN project_assignments pa ON p.id = pa.project_id
                WHERE pa.user_id = user_id;
            END
            `,
            `
            DROP PROCEDURE IF EXISTS UpdateUserSkillProficiency;
            CREATE PROCEDURE UpdateUserSkillProficiency(
                IN p_user_id INT,
                IN p_skill_name VARCHAR(50),
                IN p_new_proficiency TINYINT
            )
            BEGIN
                DECLARE skill_exists INT DEFAULT 0;
                DECLARE skill_id INT;
                
                -- Check if skill exists
                SELECT id INTO skill_id FROM skills WHERE name = p_skill_name LIMIT 1;
                
                IF skill_id IS NOT NULL THEN
                    -- Update or insert user skill
                    INSERT INTO user_skills (user_id, skill_id, proficiency, last_used)
                    VALUES (p_user_id, skill_id, p_new_proficiency, CURDATE())
                    ON DUPLICATE KEY UPDATE 
                        proficiency = p_new_proficiency,
                        last_used = CURDATE();
                        
                    SELECT 'Skill proficiency updated successfully' as message;
                ELSE
                    SELECT 'Skill not found' as message;
                END IF;
            END
            `
        ];

        try {
            for (const procedure of procedures) {
                await this.pool.execute(procedure);
            }
            console.log('📊 Stored procedures created');
        } catch (error) {
            console.error('❌ Failed to create stored procedures:', error);
        }
    }

    // 6. Advanced Analytics Queries
    async getSkillAnalytics() {
        const query = `
            WITH skill_stats AS (
                SELECT 
                    s.name,
                    s.category,
                    COUNT(us.user_id) as user_count,
                    AVG(us.proficiency) as avg_proficiency,
                    MAX(us.proficiency) as max_proficiency,
                    AVG(us.years_experience) as avg_experience
                FROM skills s
                LEFT JOIN user_skills us ON s.id = us.skill_id
                GROUP BY s.id, s.name, s.category
            ),
            category_rankings AS (
                SELECT 
                    category,
                    name,
                    user_count,
                    avg_proficiency,
                    ROW_NUMBER() OVER (PARTITION BY category ORDER BY user_count DESC, avg_proficiency DESC) as rank_in_category
                FROM skill_stats
            )
            SELECT 
                category,
                name as skill_name,
                user_count,
                ROUND(avg_proficiency, 2) as avg_proficiency,
                ROUND(avg_experience, 1) as avg_experience,
                rank_in_category
            FROM category_rankings
            WHERE rank_in_category <= 5
            ORDER BY category, rank_in_category;
        `;

        try {
            const [rows] = await this.pool.execute(query);
            return { success: true, data: rows };
        } catch (error) {
            console.error('❌ Failed to get skill analytics:', error);
            throw error;
        }
    }

    // 7. Performance Optimization
    async optimizeDatabase() {
        const optimizations = [
            // Analyze table statistics
            'ANALYZE TABLE users, projects, skills, user_skills, project_assignments',
            
            // Optimize tables
            'OPTIMIZE TABLE users, projects, skills, user_skills, project_assignments',
            
            // Update index statistics
            'FLUSH TABLES users, projects, skills, user_skills, project_assignments'
        ];

        try {
            for (const optimization of optimizations) {
                await this.pool.execute(optimization);
            }
            console.log('⚡ Database optimization completed');
        } catch (error) {
            console.error('❌ Database optimization failed:', error);
        }
    }

    // 8. Backup and Restore
    async createBackup(backupPath) {
        const mysqldumpCommand = `
            mysqldump 
            --host=${this.config.host} 
            --user=${this.config.user} 
            --password=${this.config.password} 
            --single-transaction 
            --routines 
            --triggers 
            ${this.config.database} > ${backupPath}
        `;

        console.log('💾 Backup command:', mysqldumpCommand);
        // Note: In production, execute this using child_process
        return { success: true, backupPath };
    }

    // 9. Sample Data Seeding
    async seedSampleData() {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Insert sample skills
            const skills = [
                ['JavaScript', 'frontend', 'Modern JavaScript programming language'],
                ['React', 'frontend', 'Popular frontend library for building UIs'],
                ['Node.js', 'backend', 'JavaScript runtime for server-side development'],
                ['MySQL', 'database', 'Relational database management system'],
                ['Docker', 'devops', 'Containerization platform'],
                ['AWS', 'devops', 'Amazon Web Services cloud platform']
            ];

            await connection.execute(
                `INSERT IGNORE INTO skills (name, category, description) VALUES ${skills.map(() => '(?, ?, ?)').join(', ')}`,
                skills.flat()
            );

            // Insert sample users
            const users = [
                ['bodheesh', 'bodheesh@example.com', '$2b$10$hashedpassword', 'developer', JSON.stringify({
                    name: 'Bodheesh VC',
                    location: 'Bangalore',
                    experience: '3+ years'
                })],
                ['alice', 'alice@example.com', '$2b$10$hashedpassword', 'admin', JSON.stringify({
                    name: 'Alice Johnson',
                    location: 'Mumbai',
                    experience: '5+ years'
                })]
            ];

            await connection.execute(
                `INSERT IGNORE INTO users (username, email, password_hash, role, profile) VALUES ${users.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
                users.flat()
            );

            await connection.commit();
            console.log('🌱 Sample data seeded successfully');

        } catch (error) {
            await connection.rollback();
            console.error('❌ Failed to seed sample data:', error);
        } finally {
            connection.release();
        }
    }

    // 10. Advanced Query Examples
    async getProjectDashboard(userId) {
        const query = `
            SELECT 
                p.id,
                p.title,
                p.status,
                p.budget,
                p.estimated_hours,
                p.actual_hours,
                p.deadline,
                DATEDIFF(p.deadline, CURDATE()) as days_until_deadline,
                CASE 
                    WHEN p.actual_hours > p.estimated_hours THEN 'over_budget'
                    WHEN p.actual_hours = p.estimated_hours THEN 'on_budget'
                    ELSE 'under_budget'
                END as budget_status,
                (
                    SELECT GROUP_CONCAT(u2.username SEPARATOR ', ')
                    FROM project_assignments pa2
                    JOIN users u2 ON pa2.user_id = u2.id
                    WHERE pa2.project_id = p.id
                ) as team_members
            FROM projects p
            JOIN project_assignments pa ON p.id = pa.project_id
            WHERE pa.user_id = ?
            ORDER BY 
                CASE p.status
                    WHEN 'in-progress' THEN 1
                    WHEN 'testing' THEN 2
                    WHEN 'planning' THEN 3
                    WHEN 'on-hold' THEN 4
                    WHEN 'completed' THEN 5
                END,
                p.deadline ASC
        `;

        try {
            const [rows] = await this.pool.execute(query, [userId]);
            return { success: true, data: rows };
        } catch (error) {
            console.error('❌ Failed to get project dashboard:', error);
            throw error;
        }
    }

    // 11. Full-text Search
    async searchUsers(searchTerm) {
        const query = `
            SELECT 
                u.*,
                MATCH(u.username, u.email) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance_score
            FROM users u
            WHERE MATCH(u.username, u.email) AGAINST (? IN NATURAL LANGUAGE MODE)
               OR u.profile->>'$.name' LIKE ?
               OR u.profile->>'$.location' LIKE ?
            ORDER BY relevance_score DESC, u.created_at DESC
            LIMIT 20
        `;

        const searchPattern = `%${searchTerm}%`;

        try {
            const [rows] = await this.pool.execute(query, [
                searchTerm, searchTerm, searchPattern, searchPattern
            ]);
            return { success: true, data: rows };
        } catch (error) {
            console.error('❌ Search failed:', error);
            throw error;
        }
    }

    // 12. Database Health Monitoring
    async getHealthMetrics() {
        const queries = [
            'SHOW STATUS LIKE "Connections"',
            'SHOW STATUS LIKE "Threads_connected"',
            'SHOW STATUS LIKE "Queries"',
            'SHOW STATUS LIKE "Slow_queries"',
            'SELECT COUNT(*) as total_users FROM users',
            'SELECT COUNT(*) as total_projects FROM projects',
            'SELECT COUNT(*) as total_skills FROM skills'
        ];

        const metrics = {};

        try {
            for (const query of queries) {
                const [rows] = await this.pool.execute(query);
                if (query.includes('COUNT(*)')) {
                    const tableName = query.match(/FROM (\w+)/)[1];
                    metrics[tableName] = rows[0][Object.keys(rows[0])[0]];
                } else {
                    metrics[rows[0].Variable_name] = rows[0].Value;
                }
            }

            return { success: true, data: metrics };
        } catch (error) {
            console.error('❌ Failed to get health metrics:', error);
            throw error;
        }
    }
}

// 13. Usage Example
async function demonstrateMySQL() {
    const mysqlService = new MySQLService({
        host: 'localhost',
        user: 'root',
        password: 'your_password',
        database: 'portfolio_db'
    });

    try {
        await mysqlService.connect();

        // Create a new user
        const newUser = await mysqlService.createUser({
            username: 'bodheesh_vc',
            email: 'bodheesh@portfolio.com',
            passwordHash: '$2b$10$hashedpassword',
            role: 'developer',
            profile: {
                name: 'Bodheesh VC',
                location: 'Bangalore',
                experience: '3+ years',
                specialization: 'Full Stack Development'
            },
            skills: [
                { skillId: 1, proficiency: 5, yearsExperience: 3.0 },
                { skillId: 2, proficiency: 4, yearsExperience: 2.5 }
            ]
        });

        // Get users with skills
        const usersWithSkills = await mysqlService.getUsersWithSkills({
            role: 'developer',
            minProficiency: 4
        });

        // Search users
        const searchResults = await mysqlService.searchUsers('bodheesh');

        // Get analytics
        const skillAnalytics = await mysqlService.getSkillAnalytics();
        const healthMetrics = await mysqlService.getHealthMetrics();

        console.log('📊 MySQL operations completed successfully');

    } catch (error) {
        console.error('❌ MySQL demonstration failed:', error);
    } finally {
        await mysqlService.disconnect();
    }
}

module.exports = {
    MySQLService,
    demonstrateMySQL
};

// Run demonstration if executed directly
if (require.main === module) {
    demonstrateMySQL();
}
