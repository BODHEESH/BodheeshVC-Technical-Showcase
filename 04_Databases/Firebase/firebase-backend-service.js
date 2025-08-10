/**
 * Firebase Backend Service
 * Demonstrating Firebase features: Firestore, Authentication, Storage, Functions
 * Author: Bodheesh VC
 */

const { initializeApp } = require('firebase/app');
const { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    onSnapshot,
    writeBatch,
    runTransaction
} = require('firebase/firestore');
const { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} = require('firebase/auth');
const { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} = require('firebase/storage');

class FirebaseService {
    constructor(firebaseConfig) {
        // Firebase configuration
        this.firebaseConfig = firebaseConfig || {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        };

        // Initialize Firebase
        this.app = initializeApp(this.firebaseConfig);
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.storage = getStorage(this.app);

        console.log('🔥 Firebase service initialized');
    }

    // 1. Authentication Methods
    async registerUser(email, password, userData = {}) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            await this.createUserProfile(user.uid, {
                email: user.email,
                createdAt: new Date(),
                lastLogin: new Date(),
                ...userData
            });

            console.log('✅ User registered successfully:', user.uid);
            return { success: true, user: user.uid };

        } catch (error) {
            console.error('❌ Registration failed:', error);
            return { success: false, error: error.message };
        }
    }

    async loginUser(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Update last login
            await this.updateUserProfile(user.uid, {
                lastLogin: new Date()
            });

            console.log('✅ User logged in:', user.uid);
            return { success: true, user: user.uid };

        } catch (error) {
            console.error('❌ Login failed:', error);
            return { success: false, error: error.message };
        }
    }

    async logoutUser() {
        try {
            await signOut(this.auth);
            console.log('✅ User logged out');
            return { success: true };
        } catch (error) {
            console.error('❌ Logout failed:', error);
            return { success: false, error: error.message };
        }
    }

    // 2. Firestore Database Operations
    async createUserProfile(userId, profileData) {
        try {
            const userRef = doc(this.db, 'users', userId);
            await updateDoc(userRef, profileData);
            
            console.log('👤 User profile created');
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to create user profile:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, updates) {
        try {
            const userRef = doc(this.db, 'users', userId);
            await updateDoc(userRef, {
                ...updates,
                updatedAt: new Date()
            });
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to update user profile:', error);
            throw error;
        }
    }

    // 3. Project Management with Firestore
    async createProject(projectData) {
        try {
            const projectRef = await addDoc(collection(this.db, 'projects'), {
                ...projectData,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'planning'
            });

            console.log('🚀 Project created:', projectRef.id);
            return { success: true, projectId: projectRef.id };

        } catch (error) {
            console.error('❌ Failed to create project:', error);
            throw error;
        }
    }

    async getProjects(filters = {}) {
        try {
            let projectQuery = collection(this.db, 'projects');

            // Apply filters
            if (filters.status) {
                projectQuery = query(projectQuery, where('status', '==', filters.status));
            }

            if (filters.assignedTo) {
                projectQuery = query(projectQuery, where('assignedTo', 'array-contains', filters.assignedTo));
            }

            if (filters.limit) {
                projectQuery = query(projectQuery, limit(filters.limit));
            }

            // Add ordering
            projectQuery = query(projectQuery, orderBy('createdAt', 'desc'));

            const querySnapshot = await getDocs(projectQuery);
            const projects = [];

            querySnapshot.forEach((doc) => {
                projects.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return { success: true, data: projects };

        } catch (error) {
            console.error('❌ Failed to get projects:', error);
            throw error;
        }
    }

    // 4. Real-time Data Subscription
    subscribeToProjects(callback, filters = {}) {
        let projectQuery = collection(this.db, 'projects');

        if (filters.status) {
            projectQuery = query(projectQuery, where('status', '==', filters.status));
        }

        projectQuery = query(projectQuery, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(projectQuery, (snapshot) => {
            const projects = [];
            const changes = [];

            snapshot.docChanges().forEach((change) => {
                const projectData = {
                    id: change.doc.id,
                    ...change.doc.data()
                };

                if (change.type === 'added') {
                    changes.push({ type: 'added', project: projectData });
                } else if (change.type === 'modified') {
                    changes.push({ type: 'modified', project: projectData });
                } else if (change.type === 'removed') {
                    changes.push({ type: 'removed', project: projectData });
                }
            });

            snapshot.forEach((doc) => {
                projects.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            callback({ projects, changes });
        });

        return unsubscribe;
    }

    // 5. Batch Operations
    async batchUpdateProjects(updates) {
        const batch = writeBatch(this.db);

        try {
            updates.forEach(update => {
                const projectRef = doc(this.db, 'projects', update.id);
                batch.update(projectRef, {
                    ...update.data,
                    updatedAt: new Date()
                });
            });

            await batch.commit();
            console.log(`✅ Batch updated ${updates.length} projects`);
            return { success: true };

        } catch (error) {
            console.error('❌ Batch update failed:', error);
            throw error;
        }
    }

    // 6. Transactions
    async transferProjectOwnership(projectId, fromUserId, toUserId) {
        try {
            await runTransaction(this.db, async (transaction) => {
                const projectRef = doc(this.db, 'projects', projectId);
                const projectDoc = await transaction.get(projectRef);

                if (!projectDoc.exists()) {
                    throw new Error('Project does not exist');
                }

                const projectData = projectDoc.data();
                
                // Update project owner
                transaction.update(projectRef, {
                    createdBy: toUserId,
                    transferredAt: new Date(),
                    transferredFrom: fromUserId,
                    updatedAt: new Date()
                });

                // Log the transfer
                const logRef = doc(collection(this.db, 'activity_logs'));
                transaction.set(logRef, {
                    action: 'project_transfer',
                    projectId,
                    fromUserId,
                    toUserId,
                    timestamp: new Date()
                });
            });

            console.log('🔄 Project ownership transferred');
            return { success: true };

        } catch (error) {
            console.error('❌ Transfer failed:', error);
            throw error;
        }
    }

    // 7. File Storage Operations
    async uploadFile(file, path) {
        try {
            const storageRef = ref(this.storage, path);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            console.log('📁 File uploaded successfully');
            return { success: true, url: downloadURL, path };

        } catch (error) {
            console.error('❌ File upload failed:', error);
            throw error;
        }
    }

    async uploadProjectAssets(projectId, files) {
        const uploadPromises = files.map(async (file, index) => {
            const path = `projects/${projectId}/assets/${Date.now()}_${index}_${file.name}`;
            return this.uploadFile(file, path);
        });

        try {
            const results = await Promise.all(uploadPromises);
            
            // Update project with asset URLs
            const projectRef = doc(this.db, 'projects', projectId);
            await updateDoc(projectRef, {
                assets: results.map(result => ({
                    url: result.url,
                    path: result.path,
                    uploadedAt: new Date()
                })),
                updatedAt: new Date()
            });

            return { success: true, assets: results };

        } catch (error) {
            console.error('❌ Asset upload failed:', error);
            throw error;
        }
    }

    // 8. Analytics and Aggregation
    async getPortfolioAnalytics() {
        try {
            // Get project statistics
            const projectsSnapshot = await getDocs(collection(this.db, 'projects'));
            const projects = projectsSnapshot.docs.map(doc => doc.data());

            const analytics = {
                totalProjects: projects.length,
                projectsByStatus: {},
                averageBudget: 0,
                totalBudget: 0,
                technologiesUsed: new Set(),
                recentActivity: []
            };

            // Calculate statistics
            projects.forEach(project => {
                analytics.projectsByStatus[project.status] = 
                    (analytics.projectsByStatus[project.status] || 0) + 1;
                
                if (project.budget) {
                    analytics.totalBudget += project.budget;
                }

                if (project.technologies) {
                    project.technologies.forEach(tech => 
                        analytics.technologiesUsed.add(tech.name)
                    );
                }
            });

            analytics.averageBudget = analytics.totalBudget / projects.length || 0;
            analytics.technologiesUsed = Array.from(analytics.technologiesUsed);

            return { success: true, data: analytics };

        } catch (error) {
            console.error('❌ Analytics calculation failed:', error);
            throw error;
        }
    }

    // 9. Security Rules Simulation (would be in Firebase Console)
    getSecurityRulesExample() {
        return `
            // Firestore Security Rules
            rules_version = '2';
            service cloud.firestore {
              match /databases/{database}/documents {
                // Users can read/write their own profile
                match /users/{userId} {
                  allow read, write: if request.auth != null && request.auth.uid == userId;
                }
                
                // Projects are readable by team members
                match /projects/{projectId} {
                  allow read: if request.auth != null && 
                    request.auth.uid in resource.data.assignedTo;
                  allow write: if request.auth != null && 
                    request.auth.uid == resource.data.createdBy;
                }
                
                // Activity logs are read-only for authenticated users
                match /activity_logs/{logId} {
                  allow read: if request.auth != null;
                  allow write: if false; // Only server-side writes
                }
              }
            }
        `;
    }

    // 10. Cloud Functions Integration (would be deployed separately)
    getCloudFunctionExample() {
        return `
            // Cloud Function for project notifications
            const functions = require('firebase-functions');
            const admin = require('firebase-admin');
            
            admin.initializeApp();
            
            exports.onProjectCreated = functions.firestore
                .document('projects/{projectId}')
                .onCreate(async (snap, context) => {
                    const project = snap.data();
                    const projectId = context.params.projectId;
                    
                    // Send notifications to assigned team members
                    const notifications = project.assignedTo.map(userId => ({
                        userId,
                        title: 'New Project Assignment',
                        body: \`You've been assigned to: \${project.title}\`,
                        data: { projectId, type: 'project_assignment' }
                    }));
                    
                    // Batch write notifications
                    const batch = admin.firestore().batch();
                    notifications.forEach(notification => {
                        const notifRef = admin.firestore().collection('notifications').doc();
                        batch.set(notifRef, {
                            ...notification,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            read: false
                        });
                    });
                    
                    await batch.commit();
                    console.log('Notifications sent for project:', projectId);
                });
        `;
    }
}

// 11. Portfolio-specific Firebase Implementation
class PortfolioFirebaseService extends FirebaseService {
    constructor(firebaseConfig) {
        super(firebaseConfig);
        this.setupAuthStateListener();
    }

    setupAuthStateListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                console.log('👤 User authenticated:', user.uid);
                this.syncUserData(user);
            } else {
                console.log('👤 User signed out');
            }
        });
    }

    // Portfolio-specific methods
    async createPortfolioProject(userId, projectData) {
        try {
            const project = {
                ...projectData,
                createdBy: userId,
                assignedTo: [userId],
                status: 'planning',
                createdAt: new Date(),
                updatedAt: new Date(),
                views: 0,
                likes: 0,
                tags: projectData.tags || [],
                isPublic: projectData.isPublic || false
            };

            const docRef = await addDoc(collection(this.db, 'portfolio_projects'), project);
            
            // Update user's project count
            await this.incrementUserProjectCount(userId);

            return { success: true, projectId: docRef.id };

        } catch (error) {
            console.error('❌ Failed to create portfolio project:', error);
            throw error;
        }
    }

    async getPublicProjects(limit = 10) {
        try {
            const q = query(
                collection(this.db, 'portfolio_projects'),
                where('isPublic', '==', true),
                orderBy('likes', 'desc'),
                orderBy('createdAt', 'desc'),
                limit(limit)
            );

            const querySnapshot = await getDocs(q);
            const projects = [];

            querySnapshot.forEach((doc) => {
                projects.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return { success: true, data: projects };

        } catch (error) {
            console.error('❌ Failed to get public projects:', error);
            throw error;
        }
    }

    // 12. Real-time Skills Tracking
    subscribeToUserSkills(userId, callback) {
        const skillsRef = collection(this.db, 'users', userId, 'skills');
        const q = query(skillsRef, orderBy('proficiency', 'desc'));

        return onSnapshot(q, (snapshot) => {
            const skills = [];
            snapshot.forEach((doc) => {
                skills.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            callback(skills);
        });
    }

    async updateSkillProficiency(userId, skillName, proficiency) {
        try {
            const skillRef = doc(this.db, 'users', userId, 'skills', skillName);
            await updateDoc(skillRef, {
                proficiency,
                lastUpdated: new Date(),
                updatedBy: userId
            });

            // Log skill update
            await addDoc(collection(this.db, 'activity_logs'), {
                userId,
                action: 'skill_updated',
                details: { skillName, proficiency },
                timestamp: new Date()
            });

            return { success: true };

        } catch (error) {
            console.error('❌ Failed to update skill:', error);
            throw error;
        }
    }

    // 13. File Management for Portfolio
    async uploadPortfolioImage(userId, imageFile, category = 'general') {
        try {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${imageFile.name}`;
            const imagePath = `portfolio/${userId}/${category}/${fileName}`;
            
            const result = await this.uploadFile(imageFile, imagePath);
            
            // Save image metadata to Firestore
            await addDoc(collection(this.db, 'portfolio_images'), {
                userId,
                category,
                fileName,
                url: result.url,
                path: result.path,
                uploadedAt: new Date(),
                size: imageFile.size,
                type: imageFile.type
            });

            return result;

        } catch (error) {
            console.error('❌ Portfolio image upload failed:', error);
            throw error;
        }
    }

    // 14. Advanced Queries and Aggregation
    async getSkillsAnalytics() {
        try {
            // Get all users' skills
            const usersSnapshot = await getDocs(collection(this.db, 'users'));
            const skillsMap = new Map();

            for (const userDoc of usersSnapshot.docs) {
                const skillsSnapshot = await getDocs(
                    collection(this.db, 'users', userDoc.id, 'skills')
                );

                skillsSnapshot.forEach((skillDoc) => {
                    const skill = skillDoc.data();
                    const skillName = skillDoc.id;

                    if (!skillsMap.has(skillName)) {
                        skillsMap.set(skillName, {
                            name: skillName,
                            category: skill.category,
                            totalUsers: 0,
                            avgProficiency: 0,
                            proficiencySum: 0
                        });
                    }

                    const skillData = skillsMap.get(skillName);
                    skillData.totalUsers++;
                    skillData.proficiencySum += skill.proficiency;
                    skillData.avgProficiency = skillData.proficiencySum / skillData.totalUsers;
                });
            }

            const analytics = Array.from(skillsMap.values())
                .sort((a, b) => b.totalUsers - a.totalUsers);

            return { success: true, data: analytics };

        } catch (error) {
            console.error('❌ Skills analytics failed:', error);
            throw error;
        }
    }

    // 15. Helper Methods
    async incrementUserProjectCount(userId) {
        const userRef = doc(this.db, 'users', userId);
        await updateDoc(userRef, {
            projectCount: admin.firestore.FieldValue.increment(1),
            updatedAt: new Date()
        });
    }

    async syncUserData(user) {
        try {
            const userRef = doc(this.db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // Create user profile if it doesn't exist
                await updateDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: new Date(),
                    lastLogin: new Date(),
                    projectCount: 0
                });
            } else {
                // Update last login
                await updateDoc(userRef, {
                    lastLogin: new Date()
                });
            }

        } catch (error) {
            console.error('❌ User sync failed:', error);
        }
    }
}

// 16. Usage Example
async function demonstrateFirebase() {
    const firebaseService = new PortfolioFirebaseService({
        // Your Firebase config here
        apiKey: "your-api-key",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "123456789",
        appId: "your-app-id"
    });

    try {
        console.log('🔥 Firebase demonstration starting...');

        // Register a new user
        const registration = await firebaseService.registerUser(
            'bodheesh@example.com',
            'securePassword123',
            {
                name: 'Bodheesh VC',
                role: 'developer',
                location: 'Bangalore',
                bio: 'Full-stack developer passionate about modern web technologies'
            }
        );

        if (registration.success) {
            // Create a portfolio project
            await firebaseService.createPortfolioProject(registration.user, {
                title: 'E-commerce Platform',
                description: 'Full-stack e-commerce solution with React and Node.js',
                technologies: ['React', 'Node.js', 'Firebase', 'Stripe'],
                githubUrl: 'https://github.com/bodheesh/ecommerce-platform',
                liveUrl: 'https://ecommerce-demo.netlify.app',
                isPublic: true,
                tags: ['ecommerce', 'react', 'nodejs', 'firebase']
            });

            // Get public projects
            const publicProjects = await firebaseService.getPublicProjects(5);
            console.log('📊 Public projects:', publicProjects.data.length);

            // Subscribe to real-time updates
            const unsubscribe = firebaseService.subscribeToProjects((data) => {
                console.log('🔄 Real-time update:', data.changes.length, 'changes');
            });

            // Cleanup subscription after demo
            setTimeout(() => {
                unsubscribe();
                console.log('🔄 Unsubscribed from real-time updates');
            }, 5000);
        }

    } catch (error) {
        console.error('❌ Firebase demonstration failed:', error);
    }
}

module.exports = {
    FirebaseService,
    PortfolioFirebaseService,
    demonstrateFirebase
};

// Run demonstration if executed directly
if (require.main === module) {
    demonstrateFirebase();
}
