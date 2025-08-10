-- Advanced SQL Demonstrations
-- Showcasing complex queries, joins, stored procedures, and database optimization

-- Database Schema Creation
CREATE DATABASE IF NOT EXISTS tech_portfolio;
USE tech_portfolio;

-- 1. Table Definitions with Constraints
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('admin', 'developer', 'manager', 'user') DEFAULT 'user',
    salary DECIMAL(10, 2),
    hire_date DATE NOT NULL,
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_department (department_id),
    INDEX idx_hire_date (hire_date)
);

CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    budget DECIMAL(12, 2),
    manager_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('planning', 'active', 'completed', 'on_hold') DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10, 2),
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
);

CREATE TABLE user_projects (
    user_id INT,
    project_id INT,
    role VARCHAR(50),
    hours_allocated INT DEFAULT 0,
    hours_worked INT DEFAULT 0,
    assigned_date DATE DEFAULT (CURRENT_DATE),
    PRIMARY KEY (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_skills (
    user_id INT,
    skill_id INT,
    proficiency_level INT CHECK (proficiency_level BETWEEN 1 AND 5),
    years_experience INT DEFAULT 0,
    certified BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- 2. Sample Data Insertion
INSERT INTO departments (name, budget, manager_id) VALUES
('Engineering', 500000.00, NULL),
('Product', 300000.00, NULL),
('Design', 200000.00, NULL),
('DevOps', 250000.00, NULL);

INSERT INTO users (name, email, role, salary, hire_date, department_id) VALUES
('Bodheesh VC', 'bodheesh@company.com', 'developer', 85000.00, '2021-06-15', 1),
('Alice Johnson', 'alice@company.com', 'manager', 120000.00, '2020-03-10', 1),
('Bob Smith', 'bob@company.com', 'developer', 75000.00, '2022-01-20', 1),
('Carol Davis', 'carol@company.com', 'admin', 95000.00, '2019-11-05', 2),
('David Wilson', 'david@company.com', 'developer', 80000.00, '2021-09-12', 1);

INSERT INTO skills (name, category) VALUES
('JavaScript', 'Programming'),
('TypeScript', 'Programming'),
('Java', 'Programming'),
('React.js', 'Frontend'),
('Node.js', 'Backend'),
('Express.js', 'Backend'),
('MongoDB', 'Database'),
('MySQL', 'Database'),
('PostgreSQL', 'Database'),
('AWS', 'Cloud'),
('Docker', 'DevOps'),
('Git', 'Tools');

INSERT INTO projects (name, description, status, start_date, end_date, budget, department_id) VALUES
('E-commerce Platform', 'Full-stack e-commerce solution', 'active', '2024-01-15', '2024-06-30', 150000.00, 1),
('Mobile Banking App', 'Secure mobile banking application', 'planning', '2024-03-01', '2024-12-31', 200000.00, 1),
('Analytics Dashboard', 'Real-time data visualization dashboard', 'completed', '2023-08-01', '2024-01-15', 80000.00, 1),
('Chat Application', 'Real-time messaging platform', 'active', '2024-02-01', '2024-05-30', 75000.00, 1);

-- 3. Complex JOIN Queries
-- Get all developers with their projects and skills
SELECT 
    u.name AS developer_name,
    u.email,
    d.name AS department,
    p.name AS project_name,
    p.status AS project_status,
    up.role AS project_role,
    up.hours_worked,
    GROUP_CONCAT(s.name ORDER BY us.proficiency_level DESC) AS skills
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN user_projects up ON u.id = up.user_id
LEFT JOIN projects p ON up.project_id = p.id
LEFT JOIN user_skills us ON u.id = us.user_id
LEFT JOIN skills s ON us.skill_id = s.id
WHERE u.role = 'developer'
GROUP BY u.id, p.id
ORDER BY u.name, p.name;

-- 4. Subqueries and CTEs (Common Table Expressions)
WITH project_stats AS (
    SELECT 
        p.id,
        p.name,
        p.budget,
        COUNT(up.user_id) AS team_size,
        SUM(up.hours_worked) AS total_hours,
        AVG(u.salary) AS avg_team_salary
    FROM projects p
    LEFT JOIN user_projects up ON p.id = up.project_id
    LEFT JOIN users u ON up.user_id = u.id
    GROUP BY p.id, p.name, p.budget
),
department_budgets AS (
    SELECT 
        d.id,
        d.name,
        d.budget AS dept_budget,
        SUM(p.budget) AS projects_budget
    FROM departments d
    LEFT JOIN projects p ON d.id = p.department_id
    GROUP BY d.id, d.name, d.budget
)
SELECT 
    ps.name AS project_name,
    ps.budget AS project_budget,
    ps.team_size,
    ps.total_hours,
    ROUND(ps.avg_team_salary, 2) AS avg_team_salary,
    db.dept_budget,
    ROUND((ps.budget / db.dept_budget) * 100, 2) AS budget_percentage
FROM project_stats ps
JOIN projects p ON ps.id = p.id
JOIN department_budgets db ON p.department_id = db.id
ORDER BY budget_percentage DESC;

-- 5. Window Functions
SELECT 
    u.name,
    u.salary,
    d.name AS department,
    -- Ranking functions
    ROW_NUMBER() OVER (PARTITION BY d.name ORDER BY u.salary DESC) AS salary_rank_in_dept,
    RANK() OVER (ORDER BY u.salary DESC) AS overall_salary_rank,
    -- Aggregate window functions
    AVG(u.salary) OVER (PARTITION BY d.name) AS dept_avg_salary,
    SUM(u.salary) OVER (PARTITION BY d.name) AS dept_total_salary,
    -- Lead/Lag functions
    LAG(u.salary) OVER (ORDER BY u.hire_date) AS prev_hire_salary,
    LEAD(u.salary) OVER (ORDER BY u.hire_date) AS next_hire_salary
FROM users u
JOIN departments d ON u.department_id = d.id
ORDER BY u.hire_date;

-- 6. Advanced Aggregations and Analytics
-- Skills analysis with proficiency metrics
SELECT 
    s.category,
    s.name AS skill_name,
    COUNT(us.user_id) AS users_count,
    AVG(us.proficiency_level) AS avg_proficiency,
    MAX(us.proficiency_level) AS max_proficiency,
    SUM(CASE WHEN us.certified = TRUE THEN 1 ELSE 0 END) AS certified_users,
    ROUND(
        (SUM(CASE WHEN us.certified = TRUE THEN 1 ELSE 0 END) / COUNT(us.user_id)) * 100, 
        2
    ) AS certification_percentage
FROM skills s
LEFT JOIN user_skills us ON s.id = us.skill_id
GROUP BY s.category, s.name
HAVING users_count > 0
ORDER BY s.category, avg_proficiency DESC;

-- 7. Stored Procedures
DELIMITER //

CREATE PROCEDURE GetDeveloperWorkload(
    IN developer_id INT,
    OUT total_projects INT,
    OUT total_hours INT,
    OUT avg_hours_per_project DECIMAL(10,2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    SELECT 
        COUNT(up.project_id),
        COALESCE(SUM(up.hours_worked), 0),
        COALESCE(AVG(up.hours_worked), 0)
    INTO total_projects, total_hours, avg_hours_per_project
    FROM user_projects up
    WHERE up.user_id = developer_id;
    
    COMMIT;
END //

CREATE PROCEDURE AssignSkillToUser(
    IN p_user_id INT,
    IN p_skill_name VARCHAR(50),
    IN p_proficiency INT,
    IN p_years_exp INT,
    IN p_certified BOOLEAN
)
BEGIN
    DECLARE skill_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Get or create skill
    SELECT id INTO skill_id FROM skills WHERE name = p_skill_name;
    
    IF skill_id IS NULL THEN
        INSERT INTO skills (name, category) VALUES (p_skill_name, 'General');
        SET skill_id = LAST_INSERT_ID();
    END IF;
    
    -- Insert or update user skill
    INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_experience, certified)
    VALUES (p_user_id, skill_id, p_proficiency, p_years_exp, p_certified)
    ON DUPLICATE KEY UPDATE
        proficiency_level = p_proficiency,
        years_experience = p_years_exp,
        certified = p_certified;
    
    COMMIT;
END //

DELIMITER ;

-- 8. Views for Complex Data Access
CREATE VIEW developer_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.salary,
    d.name AS department,
    COUNT(DISTINCT up.project_id) AS active_projects,
    COUNT(DISTINCT us.skill_id) AS skill_count,
    AVG(us.proficiency_level) AS avg_skill_proficiency,
    SUM(up.hours_worked) AS total_hours_worked
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN user_projects up ON u.id = up.user_id
LEFT JOIN user_skills us ON u.id = us.user_id
WHERE u.role = 'developer'
GROUP BY u.id, u.name, u.email, u.salary, d.name;

-- 9. Triggers for Audit Trail
CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(50),
    operation VARCHAR(10),
    record_id INT,
    old_values JSON,
    new_values JSON,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELIMITER //

CREATE TRIGGER user_audit_trigger
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values, changed_by)
    VALUES (
        'users',
        'UPDATE',
        NEW.id,
        JSON_OBJECT(
            'name', OLD.name,
            'email', OLD.email,
            'salary', OLD.salary,
            'role', OLD.role
        ),
        JSON_OBJECT(
            'name', NEW.name,
            'email', NEW.email,
            'salary', NEW.salary,
            'role', NEW.role
        ),
        USER()
    );
END //

DELIMITER ;

-- 10. Performance Optimization Queries
-- Index usage analysis
EXPLAIN SELECT 
    u.name, 
    p.name AS project_name,
    up.hours_worked
FROM users u
JOIN user_projects up ON u.id = up.user_id
JOIN projects p ON up.project_id = p.id
WHERE u.email = 'bodheesh@company.com'
AND p.status = 'active';

-- Query with optimization hints
SELECT /*+ USE_INDEX(users, idx_email) */
    u.name,
    COUNT(up.project_id) AS project_count
FROM users u
LEFT JOIN user_projects up ON u.id = up.user_id
WHERE u.email LIKE '%@company.com'
GROUP BY u.id, u.name
HAVING project_count > 0;

-- 11. Advanced Data Analysis Queries
-- Skill demand analysis
SELECT 
    s.name AS skill_name,
    s.category,
    COUNT(DISTINCT us.user_id) AS developers_with_skill,
    AVG(us.proficiency_level) AS avg_proficiency,
    COUNT(DISTINCT up.project_id) AS projects_using_skill,
    ROUND(
        COUNT(DISTINCT up.project_id) / COUNT(DISTINCT us.user_id),
        2
    ) AS projects_per_developer
FROM skills s
JOIN user_skills us ON s.id = us.skill_id
JOIN user_projects up ON us.user_id = up.user_id
GROUP BY s.id, s.name, s.category
ORDER BY projects_using_skill DESC, avg_proficiency DESC;

-- Project timeline analysis
SELECT 
    p.name AS project_name,
    p.status,
    DATEDIFF(COALESCE(p.end_date, CURRENT_DATE), p.start_date) AS duration_days,
    COUNT(up.user_id) AS team_size,
    SUM(up.hours_worked) AS total_hours,
    p.budget,
    ROUND(p.budget / NULLIF(SUM(up.hours_worked), 0), 2) AS cost_per_hour,
    CASE 
        WHEN p.status = 'completed' AND p.end_date <= DATE_ADD(p.start_date, INTERVAL 6 MONTH) 
        THEN 'On Time'
        WHEN p.status = 'completed' 
        THEN 'Delayed'
        WHEN CURRENT_DATE > DATE_ADD(p.start_date, INTERVAL 6 MONTH)
        THEN 'At Risk'
        ELSE 'On Track'
    END AS timeline_status
FROM projects p
LEFT JOIN user_projects up ON p.id = up.project_id
GROUP BY p.id, p.name, p.status, p.start_date, p.end_date, p.budget
ORDER BY p.start_date DESC;

-- 12. Recursive CTE for Organizational Hierarchy
WITH RECURSIVE employee_hierarchy AS (
    -- Base case: top-level managers
    SELECT 
        id,
        name,
        email,
        department_id,
        0 AS level,
        CAST(name AS CHAR(1000)) AS hierarchy_path
    FROM users 
    WHERE role = 'manager'
    
    UNION ALL
    
    -- Recursive case: employees under managers
    SELECT 
        u.id,
        u.name,
        u.email,
        u.department_id,
        eh.level + 1,
        CONCAT(eh.hierarchy_path, ' -> ', u.name)
    FROM users u
    JOIN employee_hierarchy eh ON u.department_id = eh.department_id
    WHERE u.role != 'manager' AND eh.level < 3
)
SELECT 
    level,
    REPEAT('  ', level) AS indentation,
    name,
    email,
    hierarchy_path
FROM employee_hierarchy
ORDER BY department_id, level, name;

-- 13. JSON Operations (MySQL 5.7+)
-- Store project metadata as JSON
ALTER TABLE projects ADD COLUMN metadata JSON;

UPDATE projects 
SET metadata = JSON_OBJECT(
    'technologies', JSON_ARRAY('React', 'Node.js', 'MongoDB'),
    'complexity', 'high',
    'priority', 1,
    'milestones', JSON_ARRAY(
        JSON_OBJECT('name', 'MVP', 'date', '2024-03-01'),
        JSON_OBJECT('name', 'Beta', 'date', '2024-05-01'),
        JSON_OBJECT('name', 'Launch', 'date', '2024-06-30')
    )
)
WHERE name = 'E-commerce Platform';

-- Query JSON data
SELECT 
    name,
    JSON_EXTRACT(metadata, '$.complexity') AS complexity,
    JSON_EXTRACT(metadata, '$.priority') AS priority,
    JSON_LENGTH(JSON_EXTRACT(metadata, '$.technologies')) AS tech_count,
    JSON_EXTRACT(metadata, '$.technologies') AS technologies
FROM projects 
WHERE JSON_EXTRACT(metadata, '$.complexity') = 'high';

-- 14. Stored Functions
DELIMITER //

CREATE FUNCTION CalculateProjectProgress(project_id INT) 
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_hours INT DEFAULT 0;
    DECLARE worked_hours INT DEFAULT 0;
    DECLARE progress DECIMAL(5,2) DEFAULT 0.00;
    
    SELECT 
        SUM(hours_allocated),
        SUM(hours_worked)
    INTO total_hours, worked_hours
    FROM user_projects 
    WHERE project_id = project_id;
    
    IF total_hours > 0 THEN
        SET progress = (worked_hours / total_hours) * 100;
    END IF;
    
    RETURN LEAST(progress, 100.00);
END //

DELIMITER ;

-- 15. Advanced Indexing Strategy
-- Composite index for common query patterns
CREATE INDEX idx_user_project_hours ON user_projects(user_id, project_id, hours_worked);
CREATE INDEX idx_skill_proficiency ON user_skills(skill_id, proficiency_level, certified);

-- Full-text search index
ALTER TABLE projects ADD FULLTEXT(name, description);

-- Query using full-text search
SELECT 
    name,
    description,
    MATCH(name, description) AGAINST('e-commerce platform' IN NATURAL LANGUAGE MODE) AS relevance_score
FROM projects
WHERE MATCH(name, description) AGAINST('e-commerce platform' IN NATURAL LANGUAGE MODE)
ORDER BY relevance_score DESC;

-- 16. Sample Queries for Portfolio Demonstration
-- Top performing developers by project completion
SELECT 
    u.name,
    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) AS completed_projects,
    AVG(us.proficiency_level) AS avg_skill_level,
    SUM(up.hours_worked) AS total_contribution
FROM users u
JOIN user_projects up ON u.id = up.user_id
JOIN projects p ON up.project_id = p.id
JOIN user_skills us ON u.id = us.user_id
WHERE u.role = 'developer'
GROUP BY u.id, u.name
HAVING completed_projects > 0
ORDER BY completed_projects DESC, avg_skill_level DESC;

-- Technology stack analysis
SELECT 
    s.category,
    s.name AS technology,
    COUNT(DISTINCT us.user_id) AS developer_count,
    COUNT(DISTINCT up.project_id) AS project_usage,
    AVG(us.proficiency_level) AS avg_proficiency,
    ROUND(AVG(us.years_experience), 1) AS avg_experience_years
FROM skills s
JOIN user_skills us ON s.id = us.skill_id
JOIN user_projects up ON us.user_id = up.user_id
GROUP BY s.category, s.name
ORDER BY s.category, developer_count DESC;
