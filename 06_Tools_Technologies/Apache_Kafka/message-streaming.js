/**
 * Apache Kafka Message Streaming System
 * Demonstrating event-driven architecture and real-time data processing
 * Author: Bodheesh VC
 */

const { Kafka, logLevel } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

class KafkaMessageService {
    constructor(options = {}) {
        this.clientId = options.clientId || 'bodheesh-portfolio-app';
        this.brokers = options.brokers || ['localhost:9092'];
        
        this.kafka = Kafka({
            clientId: this.clientId,
            brokers: this.brokers,
            logLevel: logLevel.INFO,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.producer = this.kafka.producer({
            maxInFlightRequests: 1,
            idempotent: true,
            transactionTimeout: 30000
        });

        this.consumer = this.kafka.consumer({
            groupId: 'portfolio-consumer-group',
            sessionTimeout: 30000,
            heartbeatInterval: 3000
        });

        this.admin = this.kafka.admin();
        this.isConnected = false;
    }

    // 1. Connection Management
    async connect() {
        try {
            await this.admin.connect();
            await this.producer.connect();
            await this.consumer.connect();
            
            this.isConnected = true;
            console.log('✅ Connected to Kafka cluster');
            
            // Create topics if they don't exist
            await this.createTopics();
            
        } catch (error) {
            console.error('❌ Failed to connect to Kafka:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.producer.disconnect();
            await this.consumer.disconnect();
            await this.admin.disconnect();
            
            this.isConnected = false;
            console.log('🔌 Disconnected from Kafka');
        } catch (error) {
            console.error('❌ Error disconnecting from Kafka:', error);
        }
    }

    // 2. Topic Management
    async createTopics() {
        const topics = [
            {
                topic: 'user-events',
                numPartitions: 3,
                replicationFactor: 1,
                configEntries: [
                    { name: 'cleanup.policy', value: 'delete' },
                    { name: 'retention.ms', value: '604800000' } // 7 days
                ]
            },
            {
                topic: 'project-updates',
                numPartitions: 2,
                replicationFactor: 1,
                configEntries: [
                    { name: 'cleanup.policy', value: 'compact' },
                    { name: 'min.cleanable.dirty.ratio', value: '0.1' }
                ]
            },
            {
                topic: 'system-metrics',
                numPartitions: 1,
                replicationFactor: 1,
                configEntries: [
                    { name: 'retention.ms', value: '86400000' } // 1 day
                ]
            },
            {
                topic: 'notifications',
                numPartitions: 2,
                replicationFactor: 1
            }
        ];

        try {
            await this.admin.createTopics({ topics });
            console.log('📋 Kafka topics created successfully');
        } catch (error) {
            if (error.type === 'TOPIC_ALREADY_EXISTS') {
                console.log('📋 Topics already exist');
            } else {
                console.error('❌ Failed to create topics:', error);
                throw error;
            }
        }
    }

    // 3. Message Production
    async publishUserEvent(eventType, userId, eventData) {
        const message = {
            key: userId,
            value: JSON.stringify({
                eventId: uuidv4(),
                eventType,
                userId,
                data: eventData,
                timestamp: new Date().toISOString(),
                source: 'portfolio-app'
            }),
            headers: {
                'content-type': 'application/json',
                'event-version': '1.0',
                'correlation-id': uuidv4()
            }
        };

        try {
            const result = await this.producer.send({
                topic: 'user-events',
                messages: [message]
            });

            console.log(`📤 User event published: ${eventType} for user ${userId}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to publish user event:', error);
            throw error;
        }
    }

    async publishProjectUpdate(projectId, updateType, updateData) {
        const message = {
            key: projectId,
            value: JSON.stringify({
                updateId: uuidv4(),
                projectId,
                updateType,
                data: updateData,
                timestamp: new Date().toISOString(),
                version: updateData.version || 1
            }),
            headers: {
                'content-type': 'application/json',
                'update-version': '1.0'
            }
        };

        try {
            const result = await this.producer.send({
                topic: 'project-updates',
                messages: [message]
            });

            console.log(`📤 Project update published: ${updateType} for project ${projectId}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to publish project update:', error);
            throw error;
        }
    }

    // 4. Batch Message Production
    async publishBatchMessages(topic, messages) {
        const kafkaMessages = messages.map(msg => ({
            key: msg.key || uuidv4(),
            value: JSON.stringify({
                ...msg,
                messageId: uuidv4(),
                timestamp: new Date().toISOString()
            }),
            headers: {
                'content-type': 'application/json',
                'batch-id': uuidv4(),
                ...msg.headers
            }
        }));

        try {
            const result = await this.producer.sendBatch({
                topicMessages: [{
                    topic,
                    messages: kafkaMessages
                }]
            });

            console.log(`📦 Batch of ${messages.length} messages published to ${topic}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to publish batch messages:', error);
            throw error;
        }
    }

    // 5. Message Consumption
    async subscribeToUserEvents(callback) {
        try {
            await this.consumer.subscribe({ 
                topic: 'user-events',
                fromBeginning: false 
            });

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const eventData = JSON.parse(message.value.toString());
                        const headers = {};
                        
                        // Parse headers
                        for (const [key, value] of Object.entries(message.headers)) {
                            headers[key] = value.toString();
                        }

                        console.log(`📥 Received user event: ${eventData.eventType}`);
                        
                        // Process the event
                        await callback({
                            ...eventData,
                            headers,
                            partition,
                            offset: message.offset
                        });

                    } catch (error) {
                        console.error('❌ Error processing user event:', error);
                        // In production, send to dead letter queue
                    }
                }
            });
        } catch (error) {
            console.error('❌ Failed to subscribe to user events:', error);
            throw error;
        }
    }

    async subscribeToProjectUpdates(callback) {
        try {
            await this.consumer.subscribe({ 
                topic: 'project-updates',
                fromBeginning: false 
            });

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const updateData = JSON.parse(message.value.toString());
                        
                        console.log(`📥 Received project update: ${updateData.updateType}`);
                        
                        await callback({
                            ...updateData,
                            partition,
                            offset: message.offset
                        });

                    } catch (error) {
                        console.error('❌ Error processing project update:', error);
                    }
                }
            });
        } catch (error) {
            console.error('❌ Failed to subscribe to project updates:', error);
            throw error;
        }
    }

    // 6. Event Handlers for Portfolio Application
    async handleUserRegistration(userData) {
        await this.publishUserEvent('USER_REGISTERED', userData.id, {
            username: userData.username,
            email: userData.email,
            role: userData.role,
            registrationSource: 'web'
        });
    }

    async handleUserLogin(userId, loginData) {
        await this.publishUserEvent('USER_LOGIN', userId, {
            loginTime: new Date().toISOString(),
            ipAddress: loginData.ipAddress,
            userAgent: loginData.userAgent,
            success: true
        });
    }

    async handleProjectCreation(projectData) {
        await this.publishProjectUpdate(projectData.id, 'PROJECT_CREATED', {
            title: projectData.title,
            technologies: projectData.technologies,
            assignedTo: projectData.assignedTo,
            budget: projectData.budget
        });
    }

    async handleSkillUpdate(userId, skillData) {
        await this.publishUserEvent('SKILL_UPDATED', userId, {
            skillName: skillData.name,
            oldProficiency: skillData.oldProficiency,
            newProficiency: skillData.newProficiency,
            category: skillData.category
        });
    }

    // 7. Metrics and Monitoring
    async publishSystemMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            activeConnections: this.getActiveConnections(),
            messageQueue: await this.getQueueMetrics()
        };

        await this.producer.send({
            topic: 'system-metrics',
            messages: [{
                key: 'system-health',
                value: JSON.stringify(metrics)
            }]
        });
    }

    getActiveConnections() {
        // Simulate connection count
        return Math.floor(Math.random() * 100) + 50;
    }

    async getQueueMetrics() {
        try {
            const metadata = await this.admin.fetchTopicMetadata({
                topics: ['user-events', 'project-updates', 'notifications']
            });

            return metadata.topics.map(topic => ({
                name: topic.name,
                partitions: topic.partitions.length,
                // Additional metrics would come from Kafka monitoring tools
            }));
        } catch (error) {
            console.error('❌ Failed to get queue metrics:', error);
            return [];
        }
    }
}

// 8. Event Processing Examples
class PortfolioEventProcessor {
    constructor(kafkaService) {
        this.kafka = kafkaService;
        this.eventHandlers = new Map();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // User event handlers
        this.eventHandlers.set('USER_REGISTERED', this.handleUserRegistered.bind(this));
        this.eventHandlers.set('USER_LOGIN', this.handleUserLogin.bind(this));
        this.eventHandlers.set('SKILL_UPDATED', this.handleSkillUpdated.bind(this));

        // Project event handlers
        this.eventHandlers.set('PROJECT_CREATED', this.handleProjectCreated.bind(this));
        this.eventHandlers.set('PROJECT_COMPLETED', this.handleProjectCompleted.bind(this));
    }

    async handleUserRegistered(eventData) {
        console.log(`🎉 New user registered: ${eventData.username}`);
        
        // Send welcome notification
        await this.kafka.producer.send({
            topic: 'notifications',
            messages: [{
                key: eventData.userId,
                value: JSON.stringify({
                    type: 'welcome',
                    userId: eventData.userId,
                    message: `Welcome to the portfolio platform, ${eventData.username}!`,
                    timestamp: new Date().toISOString()
                })
            }]
        });

        // Update analytics
        await this.updateUserAnalytics('registration', eventData);
    }

    async handleUserLogin(eventData) {
        console.log(`🔐 User login: ${eventData.userId}`);
        
        // Update last login time
        await this.updateUserLastLogin(eventData.userId, eventData.loginTime);
        
        // Check for suspicious login patterns
        await this.checkLoginSecurity(eventData);
    }

    async handleSkillUpdated(eventData) {
        console.log(`🎯 Skill updated: ${eventData.skillName} for user ${eventData.userId}`);
        
        // Update skill analytics
        await this.updateSkillAnalytics(eventData);
        
        // Recommend related projects
        await this.recommendProjects(eventData.userId, eventData.skillName);
    }

    async handleProjectCreated(eventData) {
        console.log(`🚀 New project created: ${eventData.title}`);
        
        // Notify relevant team members
        for (const userId of eventData.assignedTo) {
            await this.kafka.producer.send({
                topic: 'notifications',
                messages: [{
                    key: userId,
                    value: JSON.stringify({
                        type: 'project_assignment',
                        userId,
                        projectId: eventData.projectId,
                        projectTitle: eventData.title,
                        message: `You've been assigned to project: ${eventData.title}`,
                        timestamp: new Date().toISOString()
                    })
                }]
            });
        }
    }

    async handleProjectCompleted(eventData) {
        console.log(`✅ Project completed: ${eventData.title}`);
        
        // Calculate project metrics
        await this.calculateProjectMetrics(eventData.projectId);
        
        // Update team member achievements
        await this.updateTeamAchievements(eventData.assignedTo);
    }

    // Helper methods
    async updateUserAnalytics(eventType, data) {
        // Simulate analytics update
        console.log(`📊 Analytics updated: ${eventType}`);
    }

    async updateUserLastLogin(userId, loginTime) {
        // Simulate database update
        console.log(`⏰ Last login updated for user ${userId}`);
    }

    async checkLoginSecurity(loginData) {
        // Simulate security check
        if (loginData.ipAddress && loginData.ipAddress.startsWith('192.168.')) {
            console.log('🔒 Login from local network detected');
        }
    }

    async updateSkillAnalytics(skillData) {
        console.log(`📈 Skill analytics updated: ${skillData.skillName}`);
    }

    async recommendProjects(userId, skillName) {
        console.log(`💡 Recommending projects for ${userId} based on ${skillName}`);
    }

    async calculateProjectMetrics(projectId) {
        console.log(`📊 Calculating metrics for project ${projectId}`);
    }

    async updateTeamAchievements(teamMembers) {
        console.log(`🏆 Updating achievements for ${teamMembers.length} team members`);
    }
}

// 9. Usage Example
async function demonstrateKafkaFeatures() {
    const kafkaService = new KafkaMessageService();
    const eventProcessor = new PortfolioEventProcessor(kafkaService);

    try {
        // Connect to Kafka
        await kafkaService.connect();

        // Set up event consumers
        await kafkaService.subscribeToUserEvents(async (event) => {
            const handler = eventProcessor.eventHandlers.get(event.eventType);
            if (handler) {
                await handler(event.data);
            }
        });

        // Simulate some events
        console.log('🎬 Simulating portfolio events...');

        // User registration event
        await kafkaService.handleUserRegistration({
            id: 'user-123',
            username: 'bodheesh',
            email: 'bodheesh@example.com',
            role: 'developer'
        });

        // User login event
        await kafkaService.handleUserLogin('user-123', {
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0...'
        });

        // Project creation event
        await kafkaService.handleProjectCreation({
            id: 'project-456',
            title: 'Portfolio Website',
            technologies: ['React', 'Node.js', 'MongoDB'],
            assignedTo: ['user-123'],
            budget: 50000
        });

        // Skill update event
        await kafkaService.handleSkillUpdate('user-123', {
            name: 'React',
            oldProficiency: 4,
            newProficiency: 5,
            category: 'Frontend'
        });

        // Publish system metrics
        setInterval(async () => {
            await kafkaService.publishSystemMetrics();
        }, 30000); // Every 30 seconds

        console.log('✅ Kafka demonstration running...');

    } catch (error) {
        console.error('❌ Kafka demonstration failed:', error);
        await kafkaService.disconnect();
    }
}

module.exports = {
    KafkaMessageService,
    PortfolioEventProcessor,
    demonstrateKafkaFeatures
};

// Run demonstration if this file is executed directly
if (require.main === module) {
    demonstrateKafkaFeatures()
        .then(() => console.log('Demo completed'))
        .catch(console.error);
}
