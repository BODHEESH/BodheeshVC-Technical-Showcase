/**
 * Advanced TypeScript Features Demonstration
 * Showcasing type safety, interfaces, generics, and advanced patterns
 */

// 1. Interface Definitions
interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'developer' | 'user'; // Union types
    skills?: string[]; // Optional property
    createdAt: Date;
}

interface Project {
    id: string;
    title: string;
    description: string;
    technologies: Technology[];
    status: ProjectStatus;
    assignedTo: User[];
    metadata: ProjectMetadata;
}

interface Technology {
    name: string;
    category: 'frontend' | 'backend' | 'database' | 'devops';
    proficiency: 1 | 2 | 3 | 4 | 5; // Literal types
}

interface ProjectMetadata {
    createdAt: Date;
    updatedAt: Date;
    estimatedHours: number;
    actualHours?: number;
}

// 2. Enums
enum ProjectStatus {
    PLANNING = 'planning',
    IN_PROGRESS = 'in-progress',
    TESTING = 'testing',
    COMPLETED = 'completed',
    ON_HOLD = 'on-hold'
}

// 3. Generic Types
class ApiResponse<T> {
    constructor(
        public data: T,
        public success: boolean,
        public message: string,
        public timestamp: Date = new Date()
    ) {}

    static success<T>(data: T, message: string = 'Success'): ApiResponse<T> {
        return new ApiResponse(data, true, message);
    }

    static error<T>(message: string): ApiResponse<T> {
        return new ApiResponse(null as any, false, message);
    }
}

// 4. Generic Functions
function createRepository<T extends { id: string | number }>(items: T[]): Map<string | number, T> {
    const repository = new Map<string | number, T>();
    items.forEach(item => repository.set(item.id, item));
    return repository;
}

// 5. Advanced Type Utilities
type PartialUser = Partial<User>; // All properties optional
type RequiredProject = Required<Project>; // All properties required
type UserEmail = Pick<User, 'email'>; // Pick specific properties
type UserWithoutId = Omit<User, 'id'>; // Exclude specific properties

// 6. Conditional Types
type ApiResult<T> = T extends string ? string : T extends number ? number : T;

// 7. Mapped Types
type UserPermissions = {
    [K in keyof User]: boolean;
};

// 8. Class with Generics and Access Modifiers
class ProjectManager<T extends Project> {
    private projects: Map<string, T> = new Map();
    protected readonly maxProjects: number;

    constructor(maxProjects: number = 100) {
        this.maxProjects = maxProjects;
    }

    public addProject(project: T): boolean {
        if (this.projects.size >= this.maxProjects) {
            throw new Error('Maximum project limit reached');
        }
        
        this.projects.set(project.id, project);
        return true;
    }

    public getProject(id: string): T | undefined {
        return this.projects.get(id);
    }

    public getAllProjects(): T[] {
        return Array.from(this.projects.values());
    }

    public getProjectsByStatus(status: ProjectStatus): T[] {
        return this.getAllProjects().filter(project => project.status === status);
    }

    // Generic method
    public findProjects<K extends keyof T>(
        key: K,
        value: T[K]
    ): T[] {
        return this.getAllProjects().filter(project => project[key] === value);
    }
}

// 9. Abstract Classes and Inheritance
abstract class BaseService {
    protected abstract baseUrl: string;

    protected async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers
                },
                ...options
            });

            const data = await response.json();
            
            if (!response.ok) {
                return ApiResponse.error(`HTTP ${response.status}: ${data.message}`);
            }

            return ApiResponse.success(data);
        } catch (error) {
            return ApiResponse.error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

class UserService extends BaseService {
    protected baseUrl = 'https://api.example.com';

    async getUser(id: number): Promise<ApiResponse<User>> {
        return this.makeRequest<User>(`/users/${id}`);
    }

    async createUser(userData: UserWithoutId): Promise<ApiResponse<User>> {
        return this.makeRequest<User>('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id: number, updates: PartialUser): Promise<ApiResponse<User>> {
        return this.makeRequest<User>(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }
}

// 10. Decorators (Experimental)
function logMethod(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log(`Calling ${propertyName} with arguments:`, args);
        const result = method.apply(this, args);
        console.log(`${propertyName} returned:`, result);
        return result;
    };
}

// 11. Example Usage
const sampleUser: User = {
    id: 1,
    name: 'Bodheesh VC',
    email: 'bodheesh@example.com',
    role: 'developer',
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    createdAt: new Date()
};

const sampleProject: Project = {
    id: 'proj-001',
    title: 'E-commerce Platform',
    description: 'Full-stack e-commerce solution with React and Node.js',
    technologies: [
        { name: 'React', category: 'frontend', proficiency: 5 },
        { name: 'Node.js', category: 'backend', proficiency: 4 },
        { name: 'MongoDB', category: 'database', proficiency: 4 }
    ],
    status: ProjectStatus.IN_PROGRESS,
    assignedTo: [sampleUser],
    metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        estimatedHours: 120,
        actualHours: 80
    }
};

// Usage Examples
const projectManager = new ProjectManager<Project>();
projectManager.addProject(sampleProject);

const userService = new UserService();

// Additional variables for demonstration
const primarySkill = sampleUser.skills?.[0] || 'JavaScript';
const city = 'Bangalore';

// Async function demonstration
async function demonstrateTypeScript() {
    console.log('=== TypeScript Features Demo ===');
    
    // Type safety in action
    console.log('User Profile:', sampleUser);
    console.log('Primary Skill:', primarySkill);
    console.log('Location:', city);
    
    // Generic repository
    const userRepo = createRepository([sampleUser]);
    console.log('User from repository:', userRepo.get(1));
    
    // Project management
    const inProgressProjects = projectManager.getProjectsByStatus(ProjectStatus.IN_PROGRESS);
    console.log('In Progress Projects:', inProgressProjects.length);
    
    // API service usage
    try {
        const userResponse = await userService.getUser(1);
        if (userResponse.success) {
            console.log('Fetched user:', userResponse.data);
        }
    } catch (error) {
        console.error('Service error:', error);
    }
}

// Export for module usage
export {
    User,
    Project,
    ProjectStatus,
    ProjectManager,
    UserService,
    ApiResponse,
    demonstrateTypeScript
};

export default ProjectManager;
