-- Advanced PostgreSQL Features Demonstration
-- Showcasing JSON operations, window functions, CTEs, and performance optimization
-- Author: Bodheesh VC

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 1. Advanced Table Structures with JSON and Arrays
CREATE TABLE developers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'developer',
    salary DECIMAL(10, 2),
    hire_date DATE NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    location POINT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) CHECK (status IN ('planning', 'active', 'completed', 'on_hold')),
    technologies TEXT[] NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    budget DECIMAL(12, 2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE project_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID REFERENCES developers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    hours_allocated INTEGER DEFAULT 0,
    hours_worked INTEGER DEFAULT 0,
    assignment_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    UNIQUE(developer_id, project_id)
);

-- 2. Advanced Indexing Strategies
-- GIN index for JSONB operations
CREATE INDEX idx_developers_skills_gin ON developers USING GIN (skills);
CREATE INDEX idx_developers_preferences_gin ON developers USING GIN (preferences);

-- Partial indexes
CREATE INDEX idx_active_projects ON projects (created_at) WHERE status = 'active';
CREATE INDEX idx_high_salary_devs ON developers (salary) WHERE salary > 80000;

-- Composite indexes
CREATE INDEX idx_project_status_date ON projects (status, start_date);
CREATE INDEX idx_assignment_hours ON project_assignments (project_id, hours_worked);

-- Text search indexes
CREATE INDEX idx_projects_text_search ON projects USING GIN (to_tsvector('english', title || ' ' || description));

-- Array indexes
CREATE INDEX idx_projects_technologies_gin ON projects USING GIN (technologies);

-- 3. Trigger Functions for Automatic Updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_developers_updated_at 
    BEFORE UPDATE ON developers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Sample Data Insertion
INSERT INTO developers (name, email, role, salary, hire_date, skills, preferences, tags) VALUES
('Bodheesh VC', 'bodheesh@example.com', 'senior_developer', 85000.00, '2021-06-15',
 '[
    {"name": "JavaScript", "proficiency": 5, "category": "Language", "years_experience": 3},
    {"name": "TypeScript", "proficiency": 4, "category": "Language", "years_experience": 2},
    {"name": "React", "proficiency": 5, "category": "Frontend", "years_experience": 3},
    {"name": "Node.js", "proficiency": 4, "category": "Backend", "years_experience": 3},
    {"name": "PostgreSQL", "proficiency": 4, "category": "Database", "years_experience": 2}
 ]'::jsonb,
 '{"theme": "dark", "notifications": true, "timezone": "Asia/Kolkata"}'::jsonb,
 ARRAY['full-stack', 'react-expert', 'node-specialist']),

('Alice Johnson', 'alice@example.com', 'tech_lead', 120000.00, '2020-03-10',
 '[
    {"name": "Java", "proficiency": 5, "category": "Language", "years_experience": 5},
    {"name": "Spring Boot", "proficiency": 5, "category": "Backend", "years_experience": 4},
    {"name": "AWS", "proficiency": 4, "category": "Cloud", "years_experience": 3}
 ]'::jsonb,
 '{"theme": "light", "notifications": false}'::jsonb,
 ARRAY['java-expert', 'team-lead', 'aws-certified']);

INSERT INTO projects (title, description, status, technologies, metadata, budget, start_date) VALUES
('E-commerce Platform', 'Modern e-commerce solution with microservices architecture', 'active',
 ARRAY['React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
 '{"complexity": "high", "priority": 1, "client": "TechCorp", "milestones": [
    {"name": "MVP", "date": "2024-03-01", "completed": true},
    {"name": "Beta", "date": "2024-05-01", "completed": false},
    {"name": "Launch", "date": "2024-06-30", "completed": false}
 ]}'::jsonb,
 150000.00, '2024-01-15'),

('Analytics Dashboard', 'Real-time data visualization platform', 'completed',
 ARRAY['React', 'D3.js', 'PostgreSQL', 'Elasticsearch'],
 '{"complexity": "medium", "priority": 2, "performance_metrics": {
    "load_time": "1.2s", "queries_per_second": 1000
 }}'::jsonb,
 80000.00, '2023-08-01');

-- 5. Complex JSON Operations
-- Query developers with specific skills
SELECT 
    name,
    email,
    skills -> 'name' as skill_names,
    jsonb_array_length(skills) as skill_count
FROM developers
WHERE skills @> '[{"name": "JavaScript"}]';

-- Update JSON fields
UPDATE developers 
SET preferences = preferences || '{"email_notifications": true, "slack_integration": true}'::jsonb
WHERE email = 'bodheesh@example.com';

-- Extract and aggregate JSON data
SELECT 
    skill_data->>'category' as category,
    COUNT(*) as skill_count,
    AVG((skill_data->>'proficiency')::int) as avg_proficiency
FROM developers,
     jsonb_array_elements(skills) as skill_data
GROUP BY skill_data->>'category'
ORDER BY avg_proficiency DESC;

-- 6. Advanced Window Functions
-- Salary ranking within departments
SELECT 
    name,
    role,
    salary,
    ROW_NUMBER() OVER (PARTITION BY role ORDER BY salary DESC) as salary_rank,
    RANK() OVER (ORDER BY salary DESC) as overall_rank,
    PERCENT_RANK() OVER (ORDER BY salary) as salary_percentile,
    LAG(salary) OVER (ORDER BY hire_date) as prev_hire_salary,
    LEAD(salary) OVER (ORDER BY hire_date) as next_hire_salary,
    AVG(salary) OVER (PARTITION BY role) as role_avg_salary,
    salary - AVG(salary) OVER (PARTITION BY role) as salary_diff_from_avg
FROM developers
ORDER BY role, salary DESC;

-- Running totals and moving averages
SELECT 
    name,
    hire_date,
    salary,
    SUM(salary) OVER (ORDER BY hire_date ROWS UNBOUNDED PRECEDING) as running_total,
    AVG(salary) OVER (ORDER BY hire_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg_3
FROM developers
ORDER BY hire_date;

-- 7. Common Table Expressions (CTEs) and Recursive Queries
WITH RECURSIVE skill_hierarchy AS (
    -- Base case: top-level categories
    SELECT 
        skill_data->>'name' as skill_name,
        skill_data->>'category' as category,
        (skill_data->>'proficiency')::int as proficiency,
        1 as level
    FROM developers,
         jsonb_array_elements(skills) as skill_data
    WHERE skill_data->>'category' = 'Language'
    
    UNION ALL
    
    -- Recursive case: related skills
    SELECT 
        skill_data->>'name' as skill_name,
        skill_data->>'category' as category,
        (skill_data->>'proficiency')::int as proficiency,
        sh.level + 1
    FROM developers,
         jsonb_array_elements(skills) as skill_data,
         skill_hierarchy sh
    WHERE skill_data->>'category' != 'Language' 
    AND sh.level < 3
),
skill_stats AS (
    SELECT 
        category,
        COUNT(*) as skill_count,
        AVG(proficiency) as avg_proficiency,
        MAX(proficiency) as max_proficiency
    FROM skill_hierarchy
    GROUP BY category
)
SELECT 
    category,
    skill_count,
    ROUND(avg_proficiency, 2) as avg_proficiency,
    max_proficiency,
    CASE 
        WHEN avg_proficiency >= 4.5 THEN 'Expert'
        WHEN avg_proficiency >= 3.5 THEN 'Advanced'
        WHEN avg_proficiency >= 2.5 THEN 'Intermediate'
        ELSE 'Beginner'
    END as proficiency_level
FROM skill_stats
ORDER BY avg_proficiency DESC;

-- 8. Advanced Aggregations and Analytics
-- Technology adoption analysis
WITH tech_usage AS (
    SELECT 
        unnest(technologies) as technology,
        status,
        budget,
        EXTRACT(YEAR FROM start_date) as project_year
    FROM projects
),
tech_stats AS (
    SELECT 
        technology,
        COUNT(*) as project_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        AVG(budget) as avg_budget,
        array_agg(DISTINCT project_year ORDER BY project_year) as years_used
    FROM tech_usage
    GROUP BY technology
)
SELECT 
    technology,
    project_count,
    completed_count,
    ROUND((completed_count::float / project_count) * 100, 2) as success_rate,
    ROUND(avg_budget, 2) as avg_project_budget,
    years_used,
    CASE 
        WHEN project_count >= 5 THEN 'Core Technology'
        WHEN project_count >= 3 THEN 'Frequently Used'
        WHEN project_count >= 2 THEN 'Occasionally Used'
        ELSE 'Rarely Used'
    END as usage_category
FROM tech_stats
ORDER BY project_count DESC, success_rate DESC;

-- 9. Stored Procedures and Functions
CREATE OR REPLACE FUNCTION get_developer_skill_score(dev_id UUID)
RETURNS TABLE(
    developer_name VARCHAR,
    total_skills INTEGER,
    avg_proficiency NUMERIC,
    skill_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.name,
        jsonb_array_length(d.skills) as total_skills,
        (
            SELECT AVG((skill->>'proficiency')::int)
            FROM jsonb_array_elements(d.skills) as skill
        ) as avg_proficiency,
        (
            jsonb_array_length(d.skills) * 
            (SELECT AVG((skill->>'proficiency')::int) FROM jsonb_array_elements(d.skills) as skill)
        ) as skill_score
    FROM developers d
    WHERE d.id = dev_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate project ROI
CREATE OR REPLACE FUNCTION calculate_project_roi(project_id UUID)
RETURNS TABLE(
    project_title VARCHAR,
    total_cost NUMERIC,
    estimated_revenue NUMERIC,
    roi_percentage NUMERIC
) AS $$
DECLARE
    project_budget DECIMAL(12,2);
    team_cost DECIMAL(12,2);
BEGIN
    -- Get project budget
    SELECT budget INTO project_budget FROM projects WHERE id = project_id;
    
    -- Calculate team cost based on assignments
    SELECT COALESCE(SUM(d.salary * (pa.hours_worked / 2080.0)), 0) -- 2080 = annual working hours
    INTO team_cost
    FROM project_assignments pa
    JOIN developers d ON pa.developer_id = d.id
    WHERE pa.project_id = calculate_project_roi.project_id;
    
    RETURN QUERY
    SELECT 
        p.title,
        (project_budget + team_cost) as total_cost,
        (project_budget * 1.5) as estimated_revenue, -- Assuming 50% profit margin
        ROUND(((project_budget * 1.5 - (project_budget + team_cost)) / (project_budget + team_cost)) * 100, 2) as roi_percentage
    FROM projects p
    WHERE p.id = calculate_project_roi.project_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Advanced Query Patterns
-- Pivot table for skills by category
SELECT 
    name,
    email,
    (skills_by_category->>'Language')::int as language_skills,
    (skills_by_category->>'Frontend')::int as frontend_skills,
    (skills_by_category->>'Backend')::int as backend_skills,
    (skills_by_category->>'Database')::int as database_skills
FROM (
    SELECT 
        name,
        email,
        jsonb_object_agg(
            category, 
            skill_count
        ) as skills_by_category
    FROM (
        SELECT 
            d.name,
            d.email,
            skill_data->>'category' as category,
            COUNT(*) as skill_count
        FROM developers d,
             jsonb_array_elements(d.skills) as skill_data
        GROUP BY d.name, d.email, skill_data->>'category'
    ) skill_counts
    GROUP BY name, email
) pivoted_skills;

-- 11. Full-Text Search Implementation
-- Create materialized view for search optimization
CREATE MATERIALIZED VIEW developer_search_index AS
SELECT 
    d.id,
    d.name,
    d.email,
    d.role,
    string_agg(skill_data->>'name', ' ') as skills_text,
    array_agg(skill_data->>'name') as skills_array,
    to_tsvector('english', 
        d.name || ' ' || 
        d.email || ' ' || 
        d.role || ' ' || 
        string_agg(skill_data->>'name', ' ')
    ) as search_vector
FROM developers d,
     jsonb_array_elements(d.skills) as skill_data
GROUP BY d.id, d.name, d.email, d.role;

-- Create index on search vector
CREATE INDEX idx_developer_search ON developer_search_index USING GIN (search_vector);

-- Search function
CREATE OR REPLACE FUNCTION search_developers(search_term TEXT)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    email VARCHAR,
    role VARCHAR,
    skills_text TEXT,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dsi.id,
        dsi.name,
        dsi.email,
        dsi.role,
        dsi.skills_text,
        ts_rank(dsi.search_vector, plainto_tsquery('english', search_term)) as relevance_score
    FROM developer_search_index dsi
    WHERE dsi.search_vector @@ plainto_tsquery('english', search_term)
    ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. JSON Aggregation and Analysis
-- Skill proficiency distribution
SELECT 
    skill_data->>'category' as category,
    skill_data->>'name' as skill_name,
    COUNT(*) as developer_count,
    AVG((skill_data->>'proficiency')::int) as avg_proficiency,
    jsonb_agg(
        jsonb_build_object(
            'developer', d.name,
            'proficiency', skill_data->>'proficiency',
            'experience', skill_data->>'years_experience'
        ) ORDER BY (skill_data->>'proficiency')::int DESC
    ) as developer_details
FROM developers d,
     jsonb_array_elements(d.skills) as skill_data
GROUP BY skill_data->>'category', skill_data->>'name'
HAVING COUNT(*) > 0
ORDER BY category, avg_proficiency DESC;

-- 13. Advanced Date and Time Operations
-- Project timeline analysis with date calculations
SELECT 
    p.title,
    p.status,
    p.start_date,
    p.end_date,
    CASE 
        WHEN p.end_date IS NOT NULL THEN p.end_date - p.start_date
        ELSE CURRENT_DATE - p.start_date
    END as duration_days,
    EXTRACT(EPOCH FROM (COALESCE(p.end_date, CURRENT_DATE) - p.start_date)) / 86400 as duration_days_precise,
    DATE_TRUNC('month', p.start_date) as start_month,
    CASE 
        WHEN p.status = 'completed' AND p.end_date <= p.start_date + INTERVAL '6 months' THEN 'On Time'
        WHEN p.status = 'completed' THEN 'Delayed'
        WHEN CURRENT_DATE > p.start_date + INTERVAL '6 months' THEN 'At Risk'
        ELSE 'On Track'
    END as timeline_status,
    -- Calculate working days (excluding weekends)
    (
        SELECT COUNT(*)
        FROM generate_series(p.start_date, COALESCE(p.end_date, CURRENT_DATE), '1 day'::interval) as day
        WHERE EXTRACT(DOW FROM day) NOT IN (0, 6) -- Exclude Sunday (0) and Saturday (6)
    ) as working_days
FROM projects p
ORDER BY p.start_date DESC;

-- 14. Performance Analysis Queries
-- Query performance with EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
    d.name,
    COUNT(pa.project_id) as project_count,
    AVG(pa.hours_worked) as avg_hours
FROM developers d
LEFT JOIN project_assignments pa ON d.id = pa.developer_id
WHERE d.skills @> '[{"name": "React"}]'
GROUP BY d.id, d.name
HAVING COUNT(pa.project_id) > 0;

-- 15. Data Integrity and Constraints
-- Add check constraints
ALTER TABLE project_assignments 
ADD CONSTRAINT chk_hours_worked 
CHECK (hours_worked >= 0 AND hours_worked <= hours_allocated);

ALTER TABLE developers 
ADD CONSTRAINT chk_salary_range 
CHECK (salary > 0 AND salary <= 500000);

-- Add custom validation function
CREATE OR REPLACE FUNCTION validate_skill_proficiency()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that all skills have proficiency between 1 and 5
    IF EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(NEW.skills) as skill
        WHERE (skill->>'proficiency')::int NOT BETWEEN 1 AND 5
    ) THEN
        RAISE EXCEPTION 'Skill proficiency must be between 1 and 5';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_skills_trigger
    BEFORE INSERT OR UPDATE ON developers
    FOR EACH ROW
    EXECUTE FUNCTION validate_skill_proficiency();

-- 16. Backup and Maintenance Procedures
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_log 
    WHERE changed_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % old audit log entries', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 17. Sample Queries for Portfolio Demonstration
-- Find top developers by skill diversity and proficiency
WITH developer_metrics AS (
    SELECT 
        d.id,
        d.name,
        d.email,
        d.role,
        jsonb_array_length(d.skills) as skill_count,
        (
            SELECT AVG((skill->>'proficiency')::int)
            FROM jsonb_array_elements(d.skills) as skill
        ) as avg_proficiency,
        (
            SELECT COUNT(DISTINCT skill->>'category')
            FROM jsonb_array_elements(d.skills) as skill
        ) as category_diversity
    FROM developers d
    WHERE d.role = 'developer' OR d.role = 'senior_developer'
)
SELECT 
    name,
    email,
    skill_count,
    ROUND(avg_proficiency, 2) as avg_proficiency,
    category_diversity,
    ROUND(
        (skill_count * avg_proficiency * category_diversity) / 100.0, 
        2
    ) as overall_score
FROM developer_metrics
ORDER BY overall_score DESC;

-- Technology stack analysis
SELECT 
    tech,
    COUNT(*) as project_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
    ROUND(AVG(budget), 2) as avg_budget,
    MIN(start_date) as first_used,
    MAX(start_date) as last_used,
    ROUND(
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100,
        2
    ) as success_rate
FROM (
    SELECT 
        unnest(technologies) as tech,
        status,
        budget,
        start_date
    FROM projects
) tech_projects
GROUP BY tech
HAVING COUNT(*) > 0
ORDER BY project_count DESC, success_rate DESC;

-- 18. Database Maintenance Commands
-- Refresh materialized view
REFRESH MATERIALIZED VIEW developer_search_index;

-- Analyze tables for query optimization
ANALYZE developers;
ANALYZE projects;
ANALYZE project_assignments;

-- Check table sizes and index usage
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
