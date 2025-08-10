/**
 * Modern JavaScript Features Demonstration
 * Showcasing ES6+ features, async/await, modules, and advanced concepts
 */

// 1. Arrow Functions and Template Literals
const greetUser = (name, role = 'Developer') => {
    return `Hello ${name}! Welcome to the ${role} world! 🚀`;
};

// 2. Destructuring Assignment
const userProfile = {
    name: 'Bodheesh',
    skills: ['JavaScript', 'React', 'Node.js'],
    experience: '3+ years',
    location: { city: 'Bangalore', country: 'India' }
};

const { name, skills, location: { city } } = userProfile;
const [primarySkill, ...otherSkills] = skills;

// 3. Async/Await with Error Handling
async function fetchUserData(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Failed to fetch user data:', error.message);
        throw error;
    }
}

// 4. Classes and Inheritance
class Developer {
    constructor(name, specialization) {
        this.name = name;
        this.specialization = specialization;
        this.projects = [];
    }

    addProject(project) {
        this.projects.push({
            ...project,
            addedAt: new Date().toISOString()
        });
    }

    getProjectCount() {
        return this.projects.length;
    }

    // Getter method
    get summary() {
        return `${this.name} is a ${this.specialization} with ${this.getProjectCount()} projects`;
    }
}

class FullStackDeveloper extends Developer {
    constructor(name, frontendTech, backendTech) {
        super(name, 'Full Stack Developer');
        this.frontendTech = frontendTech;
        this.backendTech = backendTech;
    }

    getTechStack() {
        return {
            frontend: this.frontendTech,
            backend: this.backendTech
        };
    }
}

// 5. Promises and Promise.all
const simulateAPICall = (endpoint, delay = 1000) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() > 0.1) { // 90% success rate
                resolve({ endpoint, data: `Data from ${endpoint}`, timestamp: Date.now() });
            } else {
                reject(new Error(`Failed to fetch from ${endpoint}`));
            }
        }, delay);
    });
};

async function fetchMultipleEndpoints() {
    const endpoints = ['/api/users', '/api/projects', '/api/skills'];
    
    try {
        const results = await Promise.all(
            endpoints.map(endpoint => simulateAPICall(endpoint, 500))
        );
        console.log('All API calls successful:', results);
        return results;
    } catch (error) {
        console.error('One or more API calls failed:', error.message);
    }
}

// 6. Map, Filter, Reduce Operations
const projects = [
    { name: 'E-commerce App', tech: 'React', status: 'completed', lines: 5000 },
    { name: 'Chat Application', tech: 'Socket.IO', status: 'in-progress', lines: 3000 },
    { name: 'REST API', tech: 'Express', status: 'completed', lines: 2000 },
    { name: 'Mobile App', tech: 'React Native', status: 'planning', lines: 0 }
];

// Filter completed projects
const completedProjects = projects.filter(project => project.status === 'completed');

// Map to get project names
const projectNames = projects.map(project => project.name);

// Reduce to get total lines of code
const totalLinesOfCode = projects.reduce((total, project) => total + project.lines, 0);

// 7. Module Exports (ES6 Modules)
export {
    greetUser,
    Developer,
    FullStackDeveloper,
    fetchUserData,
    fetchMultipleEndpoints,
    userProfile,
    completedProjects,
    totalLinesOfCode
};

// 8. Default Export
export default class ProjectManager {
    constructor() {
        this.projects = new Map();
    }

    addProject(id, projectData) {
        this.projects.set(id, {
            ...projectData,
            createdAt: new Date(),
            id
        });
    }

    getProject(id) {
        return this.projects.get(id);
    }

    getAllProjects() {
        return Array.from(this.projects.values());
    }
}

// Example usage
console.log(greetUser('Bodheesh', 'Full Stack Developer'));

const developer = new FullStackDeveloper(
    'Bodheesh',
    ['React', 'TypeScript', 'Tailwind CSS'],
    ['Node.js', 'Express.js', 'MongoDB']
);

developer.addProject({
    name: 'Portfolio Website',
    description: 'Personal portfolio showcasing projects and skills',
    technologies: ['React', 'Tailwind CSS', 'Node.js']
});

console.log(developer.summary);
console.log('Tech Stack:', developer.getTechStack());
