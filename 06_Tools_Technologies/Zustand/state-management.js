/**
 * Zustand State Management
 * Demonstrating lightweight state management for React applications
 * Author: Bodheesh VC
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// 1. Basic Zustand Store
const useBasicStore = create((set, get) => ({
    count: 0,
    user: null,
    isLoading: false,

    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading })
}));

// 2. Portfolio Store with Persistence
const usePortfolioStore = create(
    persist(
        immer((set, get) => ({
            // State
            user: { id: null, name: '', email: '', role: 'user' },
            projects: [],
            skills: [],
            ui: { sidebarOpen: true, currentPage: 'dashboard' },

            // User Actions
            setUser: (userData) => set((state) => {
                state.user = { ...state.user, ...userData };
            }),

            logout: () => set((state) => {
                state.user = { id: null, name: '', email: '', role: 'user' };
                state.projects = [];
                state.skills = [];
            }),

            // Project Actions
            addProject: (project) => set((state) => {
                state.projects.push({
                    id: Date.now().toString(),
                    ...project,
                    createdAt: new Date()
                });
            }),

            updateProject: (id, updates) => set((state) => {
                const index = state.projects.findIndex(p => p.id === id);
                if (index !== -1) {
                    state.projects[index] = { ...state.projects[index], ...updates };
                }
            }),

            deleteProject: (id) => set((state) => {
                state.projects = state.projects.filter(p => p.id !== id);
            }),

            // Skill Actions
            addSkill: (skill) => set((state) => {
                state.skills.push({
                    id: Date.now().toString(),
                    ...skill,
                    createdAt: new Date()
                });
            }),

            updateSkillProficiency: (id, proficiency) => set((state) => {
                const skill = state.skills.find(s => s.id === id);
                if (skill) skill.proficiency = proficiency;
            }),

            // UI Actions
            toggleSidebar: () => set((state) => {
                state.ui.sidebarOpen = !state.ui.sidebarOpen;
            }),

            setCurrentPage: (page) => set((state) => {
                state.ui.currentPage = page;
            }),

            // Computed Values
            getProjectsByStatus: (status) => {
                return get().projects.filter(p => p.status === status);
            },

            getSkillsByCategory: (category) => {
                return get().skills.filter(s => s.category === category);
            }
        })),
        {
            name: 'portfolio-storage',
            storage: createJSONStorage(() => localStorage)
        }
    )
);

// 3. Async Store with Error Handling
const useAsyncStore = create((set, get) => ({
    data: null,
    loading: false,
    error: null,

    fetchData: async (url) => {
        set({ loading: true, error: null });
        try {
            const response = await fetch(url);
            const data = await response.json();
            set({ data, loading: false });
            return data;
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    reset: () => set({ data: null, loading: false, error: null })
}));

// 4. Store Composition with Slices
const createUserSlice = (set, get) => ({
    user: null,
    isAuthenticated: false,
    
    login: async (credentials) => {
        set({ loading: true });
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await response.json();
            
            if (data.success) {
                set({ user: data.user, isAuthenticated: true, loading: false });
                return { success: true };
            }
        } catch (error) {
            set({ loading: false, error: error.message });
            return { success: false, error: error.message };
        }
    },

    logout: () => set({ user: null, isAuthenticated: false })
});

const createProjectsSlice = (set, get) => ({
    projects: [],
    selectedProject: null,
    
    fetchProjects: async () => {
        set({ loading: true });
        try {
            const response = await fetch('/api/projects');
            const projects = await response.json();
            set({ projects, loading: false });
        } catch (error) {
            set({ loading: false, error: error.message });
        }
    },
    
    selectProject: (project) => set({ selectedProject: project })
});

// Combined store
const useAppStore = create((...args) => ({
    ...createUserSlice(...args),
    ...createProjectsSlice(...args)
}));

// 5. React Component Examples
const ComponentExamples = {
    Dashboard: `
    const Dashboard = () => {
        const { user, projects, addProject } = usePortfolioStore();
        const projectCount = usePortfolioStore(state => state.projects.length);
        
        return (
            <div>
                <h1>Welcome, {user.name}</h1>
                <p>Total Projects: {projectCount}</p>
                <button onClick={() => addProject({
                    title: 'New Project',
                    status: 'planning'
                })}>
                    Add Project
                </button>
            </div>
        );
    };`,

    SkillsManager: `
    const SkillsManager = () => {
        const skills = usePortfolioStore(state => state.skills);
        const { addSkill, updateSkillProficiency } = usePortfolioStore();
        
        return (
            <div>
                {skills.map(skill => (
                    <div key={skill.id}>
                        <span>{skill.name}</span>
                        <input 
                            type="range" 
                            min="1" 
                            max="5" 
                            value={skill.proficiency}
                            onChange={(e) => updateSkillProficiency(skill.id, +e.target.value)}
                        />
                    </div>
                ))}
            </div>
        );
    };`
};

// 6. Store Service Class
class ZustandService {
    constructor() {
        this.store = usePortfolioStore;
    }

    subscribeToProjects(callback) {
        return this.store.subscribe(
            (state) => state.projects,
            callback
        );
    }

    getProjectStats() {
        const state = this.store.getState();
        return {
            total: state.projects.length,
            completed: state.projects.filter(p => p.status === 'completed').length,
            inProgress: state.projects.filter(p => p.status === 'in-progress').length
        };
    }
}

// 7. Usage Example
function demonstrateZustand() {
    console.log('🐻 Zustand State Management Demo');
    
    const store = usePortfolioStore.getState();
    
    // Add sample data
    store.setUser({
        id: '1',
        name: 'Bodheesh VC',
        email: 'bodheesh@example.com'
    });

    store.addProject({
        title: 'Portfolio Website',
        description: 'Built with React and Zustand',
        status: 'completed',
        technologies: ['React', 'Zustand']
    });

    store.addSkill({
        name: 'Zustand',
        category: 'frontend',
        proficiency: 5
    });

    console.log('✅ Demo completed with sample data');
}

export {
    useBasicStore,
    usePortfolioStore,
    useAsyncStore,
    useAppStore,
    ZustandService,
    ComponentExamples,
    demonstrateZustand
};

// Run demo if executed directly
if (require.main === module) {
    demonstrateZustand();
}
