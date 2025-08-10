/**
 * React.js Portfolio Application
 * Demonstrating hooks, context, state management, and modern React patterns
 * Author: Bodheesh VC
 */

import React, { useState, useEffect, useContext, useReducer, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store/store';
import './App.css';

// Context for theme management
const ThemeContext = React.createContext();

// Custom hooks
const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
};

const useAPI = (url) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [url]);

    return { data, loading, error };
};

// Reducer for complex state management
const projectReducer = (state, action) => {
    switch (action.type) {
        case 'SET_PROJECTS':
            return { ...state, projects: action.payload, loading: false };
        case 'ADD_PROJECT':
            return { 
                ...state, 
                projects: [...state.projects, action.payload],
                totalProjects: state.totalProjects + 1
            };
        case 'UPDATE_PROJECT':
            return {
                ...state,
                projects: state.projects.map(project =>
                    project.id === action.payload.id ? action.payload : project
                )
            };
        case 'DELETE_PROJECT':
            return {
                ...state,
                projects: state.projects.filter(project => project.id !== action.payload),
                totalProjects: state.totalProjects - 1
            };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        default:
            return state;
    }
};

// Components
const Header = React.memo(({ toggleTheme, isDarkMode }) => {
    return (
        <AppBar position="static" elevation={0}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Bodheesh VC - Portfolio
                </Typography>
                <Button color="inherit" onClick={toggleTheme}>
                    {isDarkMode ? '☀️' : '🌙'}
                </Button>
            </Toolbar>
        </AppBar>
    );
});

const SkillCard = React.memo(({ skill, proficiency, category }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className={`skill-card ${category.toLowerCase()}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                transition: 'transform 0.3s ease'
            }}
        >
            <h3>{skill}</h3>
            <div className="proficiency-bar">
                <div 
                    className="proficiency-fill"
                    style={{ width: `${proficiency * 20}%` }}
                />
            </div>
            <span className="category-tag">{category}</span>
        </div>
    );
});

const ProjectCard = ({ project, onUpdate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleStatusUpdate = useCallback((newStatus) => {
        onUpdate({ ...project, status: newStatus });
    }, [project, onUpdate]);

    return (
        <div className="project-card">
            <div className="project-header">
                <h3>{project.title}</h3>
                <span className={`status-badge ${project.status}`}>
                    {project.status}
                </span>
            </div>
            
            <p className="project-description">
                {isExpanded ? project.description : `${project.description.substring(0, 100)}...`}
            </p>
            
            <button 
                className="expand-btn"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? 'Show Less' : 'Show More'}
            </button>

            <div className="project-technologies">
                {project.technologies.map((tech, index) => (
                    <span key={index} className="tech-tag">{tech}</span>
                ))}
            </div>

            <div className="project-actions">
                <select 
                    value={project.status} 
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                </select>
                <button 
                    className="delete-btn"
                    onClick={() => onDelete(project.id)}
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

const ProjectManager = () => {
    const initialState = {
        projects: [],
        loading: true,
        error: null,
        totalProjects: 0
    };

    const [state, dispatch] = useReducer(projectReducer, initialState);
    const [filter, setFilter] = useState('all');

    // Simulate API call
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                dispatch({ type: 'SET_LOADING', payload: true });
                
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const mockProjects = [
                    {
                        id: 1,
                        title: 'E-commerce Platform',
                        description: 'Full-stack e-commerce solution with React, Node.js, and MongoDB. Features include user authentication, payment integration, admin dashboard, and real-time inventory management.',
                        technologies: ['React', 'Node.js', 'MongoDB', 'Stripe', 'JWT'],
                        status: 'active',
                        createdAt: new Date('2024-01-15')
                    },
                    {
                        id: 2,
                        title: 'Real-time Chat Application',
                        description: 'WebSocket-based chat application with Socket.IO, featuring real-time messaging, file sharing, user presence indicators, and group chat functionality.',
                        technologies: ['Socket.IO', 'Express', 'React', 'Redis'],
                        status: 'completed',
                        createdAt: new Date('2023-11-20')
                    },
                    {
                        id: 3,
                        title: 'Analytics Dashboard',
                        description: 'Data visualization dashboard with real-time metrics, charts, and reporting features. Integrated with Elasticsearch for data processing.',
                        technologies: ['React', 'D3.js', 'Elasticsearch', 'Docker'],
                        status: 'planning',
                        createdAt: new Date('2024-02-01')
                    }
                ];

                dispatch({ 
                    type: 'SET_PROJECTS', 
                    payload: mockProjects 
                });
                dispatch({ 
                    type: 'SET_LOADING', 
                    payload: false 
                });
            } catch (error) {
                dispatch({ 
                    type: 'SET_ERROR', 
                    payload: error.message 
                });
            }
        };

        fetchProjects();
    }, []);

    const filteredProjects = useMemo(() => {
        if (filter === 'all') return state.projects;
        return state.projects.filter(project => project.status === filter);
    }, [state.projects, filter]);

    const handleUpdateProject = useCallback((updatedProject) => {
        dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
    }, []);

    const handleDeleteProject = useCallback((projectId) => {
        dispatch({ type: 'DELETE_PROJECT', payload: projectId });
    }, []);

    if (state.loading) {
        return <div className="loading">Loading projects...</div>;
    }

    if (state.error) {
        return <div className="error">Error: {state.error}</div>;
    }

    return (
        <div className="project-manager">
            <div className="filter-controls">
                <button 
                    className={filter === 'all' ? 'active' : ''}
                    onClick={() => setFilter('all')}
                >
                    All ({state.projects.length})
                </button>
                <button 
                    className={filter === 'active' ? 'active' : ''}
                    onClick={() => setFilter('active')}
                >
                    Active ({state.projects.filter(p => p.status === 'active').length})
                </button>
                <button 
                    className={filter === 'completed' ? 'active' : ''}
                    onClick={() => setFilter('completed')}
                >
                    Completed ({state.projects.filter(p => p.status === 'completed').length})
                </button>
            </div>

            <div className="projects-grid">
                {filteredProjects.map(project => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        onUpdate={handleUpdateProject}
                        onDelete={handleDeleteProject}
                    />
                ))}
            </div>
        </div>
    );
};

const SkillsShowcase = () => {
    const skills = [
        { name: 'JavaScript', proficiency: 5, category: 'Language' },
        { name: 'TypeScript', proficiency: 4, category: 'Language' },
        { name: 'React.js', proficiency: 5, category: 'Frontend' },
        { name: 'Node.js', proficiency: 4, category: 'Backend' },
        { name: 'MongoDB', proficiency: 4, category: 'Database' },
        { name: 'AWS', proficiency: 3, category: 'Cloud' },
        { name: 'Docker', proficiency: 3, category: 'DevOps' }
    ];

    const groupedSkills = useMemo(() => {
        return skills.reduce((acc, skill) => {
            if (!acc[skill.category]) {
                acc[skill.category] = [];
            }
            acc[skill.category].push(skill);
            return acc;
        }, {});
    }, []);

    return (
        <div className="skills-showcase">
            <h2>Technical Skills</h2>
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <div key={category} className="skill-category">
                    <h3>{category}</h3>
                    <div className="skills-grid">
                        {categorySkills.map((skill, index) => (
                            <SkillCard
                                key={index}
                                skill={skill.name}
                                proficiency={skill.proficiency}
                                category={skill.category}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Higher-Order Component
const withLoading = (WrappedComponent) => {
    return function WithLoadingComponent(props) {
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 1000);

            return () => clearTimeout(timer);
        }, []);

        if (isLoading) {
            return <div className="loading-spinner">Loading...</div>;
        }

        return <WrappedComponent {...props} />;
    };
};

const EnhancedProjectManager = withLoading(ProjectManager);

// Main App Component
function App() {
    const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);
    const [user, setUser] = useState(null);

    const theme = useMemo(() => createTheme({
        palette: {
            mode: isDarkMode ? 'dark' : 'light',
            primary: {
                main: '#2563eb',
            },
            secondary: {
                main: '#f59e0b',
            },
        },
    }), [isDarkMode]);

    const toggleTheme = useCallback(() => {
        setIsDarkMode(prev => !prev);
    }, [setIsDarkMode]);

    // Simulate user authentication
    useEffect(() => {
        const mockUser = {
            id: 1,
            name: 'Bodheesh VC',
            email: 'bodheesh@example.com',
            role: 'developer'
        };
        setUser(mockUser);
    }, []);

    const themeContextValue = useMemo(() => ({
        isDarkMode,
        toggleTheme
    }), [isDarkMode, toggleTheme]);

    return (
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <ThemeContext.Provider value={themeContextValue}>
                    <CssBaseline />
                    <Router>
                        <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
                            <Header toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
                            
                            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                                <Routes>
                                    <Route path="/" element={<Navigate to="/portfolio" replace />} />
                                    <Route path="/portfolio" element={
                                        <div>
                                            <SkillsShowcase />
                                            <EnhancedProjectManager />
                                        </div>
                                    } />
                                    <Route path="/projects" element={<EnhancedProjectManager />} />
                                    <Route path="/skills" element={<SkillsShowcase />} />
                                </Routes>
                            </Container>
                        </div>
                    </Router>
                </ThemeContext.Provider>
            </ThemeProvider>
        </Provider>
    );
}

// Custom Hook for Theme Context
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default App;
