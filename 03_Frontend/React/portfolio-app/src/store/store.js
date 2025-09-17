/**
 * Redux Toolkit Store Configuration
 * Demonstrating modern Redux patterns with RTK Query
 */

import { configureStore } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { createSlice } from '@reduxjs/toolkit';

// 1. API Slice using RTK Query
export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api',
        prepareHeaders: (headers, { getState }) => {
            const token = getState().auth.token;
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['User', 'Project', 'Skill'],
    endpoints: (builder) => ({
        // User endpoints
        getUsers: builder.query({
            query: ({ page = 1, limit = 10, search = '' } = {}) => 
                `users?page=${page}&limit=${limit}&search=${search}`,
            providesTags: ['User'],
        }),
        getUserProfile: builder.query({
            query: () => 'users/profile',
            providesTags: ['User'],
        }),
        updateUserProfile: builder.mutation({
            query: (userData) => ({
                url: 'users/profile',
                method: 'PUT',
                body: userData,
            }),
            invalidatesTags: ['User'],
        }),
        
        // Project endpoints
        getProjects: builder.query({
            query: ({ status, assignedTo } = {}) => {
                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (assignedTo) params.append('assignedTo', assignedTo);
                return `projects?${params.toString()}`;
            },
            providesTags: ['Project'],
        }),
        createProject: builder.mutation({
            query: (projectData) => ({
                url: 'projects',
                method: 'POST',
                body: projectData,
            }),
            invalidatesTags: ['Project'],
        }),
        updateProject: builder.mutation({
            query: ({ id, ...projectData }) => ({
                url: `projects/${id}`,
                method: 'PUT',
                body: projectData,
            }),
            invalidatesTags: ['Project'],
        }),
        deleteProject: builder.mutation({
            query: (id) => ({
                url: `projects/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Project'],
        }),
    }),
});

// 2. Auth Slice
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('token'),
        isAuthenticated: false,
        loading: false,
        error: null,
    },
    reducers: {
        loginStart: (state) => {
            state.loading = true;
            state.error = null;
        },
        loginSuccess: (state, action) => {
            state.loading = false;
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            localStorage.setItem('token', action.payload.token);
        },
        loginFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
            state.isAuthenticated = false;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
        },
        clearError: (state) => {
            state.error = null;
        },
    },
});

// 3. UI Slice for application state
const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        theme: 'light',
        sidebarOpen: false,
        notifications: [],
        loading: {
            global: false,
            projects: false,
            users: false,
        },
    },
    reducers: {
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        addNotification: (state, action) => {
            state.notifications.push({
                id: Date.now(),
                ...action.payload,
                timestamp: new Date().toISOString(),
            });
        },
        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(
                notification => notification.id !== action.payload
            );
        },
        setLoading: (state, action) => {
            const { key, value } = action.payload;
            state.loading[key] = value;
        },
    },
});

// 4. Skills Slice
const skillsSlice = createSlice({
    name: 'skills',
    initialState: {
        skills: [
            { id: 1, name: 'JavaScript', category: 'Language', proficiency: 5, yearsExp: 3 },
            { id: 2, name: 'TypeScript', category: 'Language', proficiency: 4, yearsExp: 2 },
            { id: 3, name: 'React.js', category: 'Frontend', proficiency: 5, yearsExp: 3 },
            { id: 4, name: 'Node.js', category: 'Backend', proficiency: 4, yearsExp: 3 },
            { id: 5, name: 'Express.js', category: 'Backend', proficiency: 4, yearsExp: 3 },
            { id: 6, name: 'MongoDB', category: 'Database', proficiency: 4, yearsExp: 2 },
            { id: 7, name: 'PostgreSQL', category: 'Database', proficiency: 3, yearsExp: 2 },
            { id: 8, name: 'AWS', category: 'Cloud', proficiency: 3, yearsExp: 1 },
            { id: 9, name: 'Docker', category: 'DevOps', proficiency: 3, yearsExp: 1 },
            { id: 10, name: 'Data Structures', category: 'DSA', proficiency: 5, yearsExp: 4 },
            { id: 11, name: 'Algorithms', category: 'DSA', proficiency: 5, yearsExp: 4 },
            { id: 12, name: 'Problem Solving', category: 'DSA', proficiency: 5, yearsExp: 4 },
            { id: 13, name: 'Dynamic Programming', category: 'DSA', proficiency: 4, yearsExp: 3 },
            { id: 14, name: 'Graph Algorithms', category: 'DSA', proficiency: 4, yearsExp: 3 },
            { id: 15, name: 'Complexity Analysis', category: 'DSA', proficiency: 5, yearsExp: 4 },
            { id: 16, name: 'System Architecture', category: 'System Design', proficiency: 5, yearsExp: 3 },
            { id: 17, name: 'Microservices', category: 'System Design', proficiency: 4, yearsExp: 2 },
            { id: 18, name: 'Scalability Design', category: 'System Design', proficiency: 4, yearsExp: 3 },
            { id: 19, name: 'Database Design', category: 'System Design', proficiency: 5, yearsExp: 4 },
            { id: 20, name: 'Distributed Systems', category: 'System Design', proficiency: 4, yearsExp: 2 },
            { id: 21, name: 'Performance Optimization', category: 'System Design', proficiency: 4, yearsExp: 3 },
        ],
        categories: ['Language', 'Frontend', 'Backend', 'Database', 'Cloud', 'DevOps', 'DSA', 'System Design'],
        selectedCategory: 'all',
    },
    reducers: {
        addSkill: (state, action) => {
            state.skills.push({
                id: Date.now(),
                ...action.payload,
            });
        },
        updateSkill: (state, action) => {
            const index = state.skills.findIndex(skill => skill.id === action.payload.id);
            if (index !== -1) {
                state.skills[index] = { ...state.skills[index], ...action.payload };
            }
        },
        removeSkill: (state, action) => {
            state.skills = state.skills.filter(skill => skill.id !== action.payload);
        },
        setSelectedCategory: (state, action) => {
            state.selectedCategory = action.payload;
        },
        updateProficiency: (state, action) => {
            const { skillId, proficiency } = action.payload;
            const skill = state.skills.find(s => s.id === skillId);
            if (skill) {
                skill.proficiency = proficiency;
            }
        },
    },
});

// 5. Async Thunks for complex operations
import { createAsyncThunk } from '@reduxjs/toolkit';

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return rejectWithValue(data.message);
            }

            return data.data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserProjects = createAsyncThunk(
    'projects/fetchUserProjects',
    async (userId, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            const response = await fetch(`/api/projects?assignedTo=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${auth.token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return rejectWithValue(data.message);
            }

            return data.data.projects;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// 6. Enhanced Auth Slice with async thunks
const enhancedAuthSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('token'),
        isAuthenticated: !!localStorage.getItem('token'),
        loading: false,
        error: null,
    },
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            });
    },
});

// 7. Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

export const selectSkillsByCategory = (state, category) => {
    if (category === 'all') return state.skills.skills;
    return state.skills.skills.filter(skill => skill.category === category);
};

export const selectSkillsStats = (state) => {
    const skills = state.skills.skills;
    return {
        total: skills.length,
        avgProficiency: skills.reduce((sum, skill) => sum + skill.proficiency, 0) / skills.length,
        categories: [...new Set(skills.map(skill => skill.category))].length,
        expertSkills: skills.filter(skill => skill.proficiency >= 4).length,
    };
};

// 8. Store Configuration
export const store = configureStore({
    reducer: {
        api: apiSlice.reducer,
        auth: enhancedAuthSlice.reducer,
        ui: uiSlice.reducer,
        skills: skillsSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }).concat(apiSlice.middleware),
    devTools: process.env.NODE_ENV !== 'production',
});

// 9. Export actions
export const { logout, clearError } = enhancedAuthSlice.actions;
export const { toggleTheme, toggleSidebar, addNotification, removeNotification, setLoading } = uiSlice.actions;
export const { addSkill, updateSkill, removeSkill, setSelectedCategory, updateProficiency } = skillsSlice.actions;

// 10. Export API hooks
export const {
    useGetUsersQuery,
    useGetUserProfileQuery,
    useUpdateUserProfileMutation,
    useGetProjectsQuery,
    useCreateProjectMutation,
    useUpdateProjectMutation,
    useDeleteProjectMutation,
} = apiSlice;

// 11. Store types (for TypeScript usage, create a separate .d.ts file)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

// For JavaScript usage, you can access types like this:
// const state = store.getState(); // RootState equivalent
// const dispatch = store.dispatch; // AppDispatch equivalent
