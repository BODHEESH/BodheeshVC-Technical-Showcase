/**
 * MongoDB Database Operations Demonstration
 * Showcasing aggregation pipelines, indexing, and advanced queries
 * Author: Bodheesh VC
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

class MongoDBService {
    constructor(connectionString = 'mongodb://localhost:27017', dbName = 'portfolio_db') {
        this.connectionString = connectionString;
        this.dbName = dbName;
        this.client = null;
        this.db = null;
    }

    // 1. Connection Management
    async connect() {
        try {
            this.client = new MongoClient(this.connectionString, {
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            await this.client.connect();
            this.db = this.client.db(this.dbName);
            console.log('✅ Connected to MongoDB successfully');
            
            // Create indexes
            await this.createIndexes();
            
            return this.db;
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('🔌 Disconnected from MongoDB');
        }
    }

    // 2. Index Creation for Performance
    async createIndexes() {
        const users = this.db.collection('users');
        const projects = this.db.collection('projects');
        const skills = this.db.collection('skills');

        // User indexes
        await users.createIndex({ email: 1 }, { unique: true });
        await users.createIndex({ role: 1 });
        await users.createIndex({ 'skills.name': 1 });
        await users.createIndex({ createdAt: -1 });

        // Project indexes
        await projects.createIndex({ status: 1 });
        await projects.createIndex({ 'assignedTo': 1 });
        await projects.createIndex({ 'technologies': 1 });
        await projects.createIndex({ title: 'text', description: 'text' });

        // Compound indexes
        await projects.createIndex({ status: 1, createdAt: -1 });
        await users.createIndex({ role: 1, 'skills.proficiency': -1 });

        console.log('📊 Database indexes created successfully');
    }

    // 3. User CRUD Operations
    async createUser(userData) {
        try {
            const users = this.db.collection('users');
            
            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            const user = {
                ...userData,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: null,
                isActive: true
            };

            const result = await users.insertOne(user);
            console.log(`👤 User created with ID: ${result.insertedId}`);
            
            // Return user without password
            const { password, ...userWithoutPassword } = user;
            return { ...userWithoutPassword, _id: result.insertedId };
        } catch (error) {
            if (error.code === 11000) {
                throw new Error('User with this email already exists');
            }
            throw error;
        }
    }

    async findUserByEmail(email) {
        const users = this.db.collection('users');
        return await users.findOne({ email });
    }

    async updateUser(userId, updateData) {
        const users = this.db.collection('users');
        
        const result = await users.updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    ...updateData, 
                    updatedAt: new Date() 
                } 
            }
        );

        return result.modifiedCount > 0;
    }

    // 4. Advanced Aggregation Pipelines
    async getUserSkillsAnalytics() {
        const users = this.db.collection('users');
        
        return await users.aggregate([
            // Unwind skills array
            { $unwind: '$skills' },
            
            // Group by skill name and calculate statistics
            {
                $group: {
                    _id: '$skills.name',
                    category: { $first: '$skills.category' },
                    avgProficiency: { $avg: '$skills.proficiency' },
                    maxProficiency: { $max: '$skills.proficiency' },
                    userCount: { $sum: 1 },
                    users: { 
                        $push: {
                            name: '$name',
                            email: '$email',
                            proficiency: '$skills.proficiency'
                        }
                    }
                }
            },
            
            // Sort by user count and average proficiency
            { $sort: { userCount: -1, avgProficiency: -1 } },
            
            // Add calculated fields
            {
                $addFields: {
                    skillName: '$_id',
                    popularityScore: {
                        $multiply: ['$userCount', '$avgProficiency']
                    }
                }
            },
            
            // Project final structure
            {
                $project: {
                    _id: 0,
                    skillName: 1,
                    category: 1,
                    avgProficiency: { $round: ['$avgProficiency', 2] },
                    maxProficiency: 1,
                    userCount: 1,
                    popularityScore: { $round: ['$popularityScore', 2] },
                    topUsers: { $slice: ['$users', 3] }
                }
            }
        ]).toArray();
    }

    async getProjectAnalytics() {
        const projects = this.db.collection('projects');
        
        return await projects.aggregate([
            // Add calculated fields
            {
                $addFields: {
                    teamSize: { $size: '$assignedTo' },
                    techCount: { $size: '$technologies' },
                    durationDays: {
                        $dateDiff: {
                            startDate: '$startDate',
                            endDate: { $ifNull: ['$endDate', new Date()] },
                            unit: 'day'
                        }
                    }
                }
            },
            
            // Group by status for summary
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgTeamSize: { $avg: '$teamSize' },
                    avgDuration: { $avg: '$durationDays' },
                    totalBudget: { $sum: '$budget' },
                    projects: {
                        $push: {
                            title: '$title',
                            teamSize: '$teamSize',
                            technologies: '$technologies',
                            budget: '$budget'
                        }
                    }
                }
            },
            
            // Sort by count
            { $sort: { count: -1 } }
        ]).toArray();
    }

    // 5. Complex Queries with Multiple Conditions
    async findDevelopersWithSkills(requiredSkills, minProficiency = 3) {
        const users = this.db.collection('users');
        
        return await users.find({
            role: 'developer',
            $and: requiredSkills.map(skillName => ({
                'skills': {
                    $elemMatch: {
                        name: skillName,
                        proficiency: { $gte: minProficiency }
                    }
                }
            }))
        }).toArray();
    }

    async getProjectsByTechnology(technology) {
        const projects = this.db.collection('projects');
        
        return await projects.aggregate([
            // Match projects using the technology
            { $match: { technologies: technology } },
            
            // Lookup assigned users
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedTo',
                    foreignField: '_id',
                    as: 'team'
                }
            },
            
            // Project team skills
            {
                $addFields: {
                    teamSkills: {
                        $reduce: {
                            input: '$team',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this.skills'] }
                        }
                    }
                }
            },
            
            // Group skills by name
            {
                $addFields: {
                    uniqueSkills: {
                        $setUnion: ['$teamSkills.name', []]
                    }
                }
            }
        ]).toArray();
    }

    // 6. Bulk Operations
    async bulkUpdateProjects(updates) {
        const projects = this.db.collection('projects');
        
        const bulkOps = updates.map(update => ({
            updateOne: {
                filter: { _id: new ObjectId(update.id) },
                update: { 
                    $set: { 
                        ...update.data, 
                        updatedAt: new Date() 
                    } 
                }
            }
        }));

        const result = await projects.bulkWrite(bulkOps);
        console.log(`📝 Bulk update completed: ${result.modifiedCount} projects updated`);
        return result;
    }

    async bulkInsertSkills(skillsData) {
        const skills = this.db.collection('skills');
        
        const skillsWithTimestamp = skillsData.map(skill => ({
            ...skill,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        const result = await skills.insertMany(skillsWithTimestamp, { ordered: false });
        console.log(`🎯 Bulk insert completed: ${result.insertedCount} skills added`);
        return result;
    }

    // 7. Transaction Management
    async transferProjectOwnership(fromUserId, toUserId, projectId) {
        const session = this.client.startSession();
        
        try {
            await session.withTransaction(async () => {
                const users = this.db.collection('users');
                const projects = this.db.collection('projects');

                // Remove project from old owner
                await users.updateOne(
                    { _id: new ObjectId(fromUserId) },
                    { $pull: { ownedProjects: new ObjectId(projectId) } },
                    { session }
                );

                // Add project to new owner
                await users.updateOne(
                    { _id: new ObjectId(toUserId) },
                    { $addToSet: { ownedProjects: new ObjectId(projectId) } },
                    { session }
                );

                // Update project owner
                await projects.updateOne(
                    { _id: new ObjectId(projectId) },
                    { 
                        $set: { 
                            ownerId: new ObjectId(toUserId),
                            updatedAt: new Date()
                        } 
                    },
                    { session }
                );

                console.log(`🔄 Project ownership transferred successfully`);
            });
        } catch (error) {
            console.error('❌ Transaction failed:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // 8. Text Search and Indexing
    async searchProjects(searchTerm) {
        const projects = this.db.collection('projects');
        
        return await projects.aggregate([
            // Text search
            {
                $match: {
                    $text: { $search: searchTerm }
                }
            },
            
            // Add search score
            {
                $addFields: {
                    searchScore: { $meta: 'textScore' }
                }
            },
            
            // Sort by relevance
            { $sort: { searchScore: { $meta: 'textScore' } } },
            
            // Lookup project team
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedTo',
                    foreignField: '_id',
                    as: 'team',
                    pipeline: [
                        { $project: { name: 1, email: 1, role: 1 } }
                    ]
                }
            }
        ]).toArray();
    }

    // 9. Geospatial Queries (if location data exists)
    async findNearbyDevelopers(longitude, latitude, maxDistanceKm = 50) {
        const users = this.db.collection('users');
        
        return await users.find({
            role: 'developer',
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: maxDistanceKm * 1000 // Convert to meters
                }
            }
        }).toArray();
    }

    // 10. Data Validation with JSON Schema
    async setupCollectionValidation() {
        // User collection validation
        await this.db.createCollection('users', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'email', 'role'],
                    properties: {
                        name: {
                            bsonType: 'string',
                            minLength: 2,
                            maxLength: 100
                        },
                        email: {
                            bsonType: 'string',
                            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                        },
                        role: {
                            enum: ['admin', 'developer', 'manager', 'user']
                        },
                        skills: {
                            bsonType: 'array',
                            items: {
                                bsonType: 'object',
                                required: ['name', 'proficiency'],
                                properties: {
                                    name: { bsonType: 'string' },
                                    proficiency: { bsonType: 'int', minimum: 1, maximum: 5 },
                                    category: { bsonType: 'string' },
                                    yearsExperience: { bsonType: 'int', minimum: 0 }
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log('✅ Collection validation rules applied');
    }

    // 11. Change Streams for Real-time Updates
    watchProjectChanges(callback) {
        const projects = this.db.collection('projects');
        
        const changeStream = projects.watch([
            { $match: { 'fullDocument.status': { $in: ['active', 'completed'] } } }
        ]);

        changeStream.on('change', (change) => {
            console.log('📢 Project change detected:', change.operationType);
            callback(change);
        });

        return changeStream;
    }

    // 12. Sample Data Insertion
    async insertSampleData() {
        try {
            // Sample users
            const sampleUsers = [
                {
                    name: 'Bodheesh VC',
                    email: 'bodheesh@example.com',
                    password: await bcrypt.hash('password123', 10),
                    role: 'developer',
                    skills: [
                        { name: 'JavaScript', proficiency: 5, category: 'Language', yearsExperience: 3 },
                        { name: 'React', proficiency: 5, category: 'Frontend', yearsExperience: 3 },
                        { name: 'Node.js', proficiency: 4, category: 'Backend', yearsExperience: 3 },
                        { name: 'MongoDB', proficiency: 4, category: 'Database', yearsExperience: 2 }
                    ],
                    location: {
                        type: 'Point',
                        coordinates: [77.5946, 12.9716] // Bangalore coordinates
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    name: 'Alice Johnson',
                    email: 'alice@example.com',
                    password: await bcrypt.hash('password123', 10),
                    role: 'manager',
                    skills: [
                        { name: 'Project Management', proficiency: 5, category: 'Management', yearsExperience: 5 },
                        { name: 'Agile', proficiency: 4, category: 'Methodology', yearsExperience: 4 }
                    ],
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const users = this.db.collection('users');
            const userResult = await users.insertMany(sampleUsers);
            
            // Sample projects
            const sampleProjects = [
                {
                    title: 'E-commerce Platform',
                    description: 'Full-stack e-commerce solution with modern technologies',
                    technologies: ['React', 'Node.js', 'MongoDB', 'Stripe', 'JWT'],
                    status: 'active',
                    assignedTo: [userResult.insertedIds[0]],
                    ownerId: userResult.insertedIds[0],
                    budget: 150000,
                    startDate: new Date('2024-01-15'),
                    estimatedEndDate: new Date('2024-06-30'),
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    title: 'Real-time Chat Application',
                    description: 'WebSocket-based chat with advanced features',
                    technologies: ['Socket.IO', 'Express', 'React', 'Redis'],
                    status: 'completed',
                    assignedTo: [userResult.insertedIds[0]],
                    ownerId: userResult.insertedIds[1],
                    budget: 75000,
                    startDate: new Date('2023-11-01'),
                    endDate: new Date('2024-01-15'),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const projects = this.db.collection('projects');
            await projects.insertMany(sampleProjects);
            
            console.log('📊 Sample data inserted successfully');
            return { users: userResult.insertedIds, projects: sampleProjects };
        } catch (error) {
            console.error('❌ Error inserting sample data:', error);
            throw error;
        }
    }

    // 13. Advanced Query Methods
    async getDeveloperWorkload() {
        const users = this.db.collection('users');
        
        return await users.aggregate([
            // Match only developers
            { $match: { role: 'developer' } },
            
            // Lookup assigned projects
            {
                $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: 'assignedTo',
                    as: 'assignedProjects'
                }
            },
            
            // Calculate workload metrics
            {
                $addFields: {
                    totalProjects: { $size: '$assignedProjects' },
                    activeProjects: {
                        $size: {
                            $filter: {
                                input: '$assignedProjects',
                                cond: { $eq: ['$$this.status', 'active'] }
                            }
                        }
                    },
                    completedProjects: {
                        $size: {
                            $filter: {
                                input: '$assignedProjects',
                                cond: { $eq: ['$$this.status', 'completed'] }
                            }
                        }
                    },
                    avgProjectBudget: { $avg: '$assignedProjects.budget' }
                }
            },
            
            // Project final fields
            {
                $project: {
                    name: 1,
                    email: 1,
                    skills: 1,
                    totalProjects: 1,
                    activeProjects: 1,
                    completedProjects: 1,
                    avgProjectBudget: { $round: ['$avgProjectBudget', 2] },
                    workloadScore: {
                        $multiply: ['$activeProjects', 2]
                    }
                }
            },
            
            // Sort by workload
            { $sort: { workloadScore: -1 } }
        ]).toArray();
    }

    // 14. Data Export/Import Functions
    async exportCollection(collectionName) {
        const collection = this.db.collection(collectionName);
        const data = await collection.find({}).toArray();
        
        const exportData = {
            collection: collectionName,
            exportDate: new Date().toISOString(),
            count: data.length,
            data: data
        };

        return exportData;
    }

    async importCollection(collectionName, data) {
        const collection = this.db.collection(collectionName);
        
        // Clear existing data (use with caution)
        await collection.deleteMany({});
        
        // Insert new data
        if (data.length > 0) {
            const result = await collection.insertMany(data);
            console.log(`📥 Imported ${result.insertedCount} documents to ${collectionName}`);
            return result;
        }
    }
}

// 15. Usage Examples and Testing
async function demonstrateMongoDBFeatures() {
    const mongoService = new MongoDBService();
    
    try {
        // Connect to database
        await mongoService.connect();
        
        // Insert sample data
        console.log('🔄 Inserting sample data...');
        await mongoService.insertSampleData();
        
        // Demonstrate analytics
        console.log('\n📊 Skills Analytics:');
        const skillsAnalytics = await mongoService.getUserSkillsAnalytics();
        console.log(JSON.stringify(skillsAnalytics, null, 2));
        
        console.log('\n📈 Project Analytics:');
        const projectAnalytics = await mongoService.getProjectAnalytics();
        console.log(JSON.stringify(projectAnalytics, null, 2));
        
        // Demonstrate complex queries
        console.log('\n🔍 Finding React developers:');
        const reactDevelopers = await mongoService.findDevelopersWithSkills(['React'], 4);
        console.log(reactDevelopers.map(dev => ({ name: dev.name, email: dev.email })));
        
        console.log('\n👥 Developer workload analysis:');
        const workloadAnalysis = await mongoService.getDeveloperWorkload();
        console.log(JSON.stringify(workloadAnalysis, null, 2));
        
        // Demonstrate change streams
        console.log('\n👁️ Setting up change stream monitoring...');
        const changeStream = mongoService.watchProjectChanges((change) => {
            console.log('Project change detected:', {
                operation: change.operationType,
                project: change.fullDocument?.title
            });
        });
        
        // Cleanup after demo
        setTimeout(async () => {
            changeStream.close();
            await mongoService.disconnect();
        }, 5000);
        
    } catch (error) {
        console.error('❌ Demo failed:', error);
        await mongoService.disconnect();
    }
}

module.exports = {
    MongoDBService,
    demonstrateMongoDBFeatures
};

// Run demonstration if this file is executed directly
if (require.main === module) {
    demonstrateMongoDBFeatures();
}
