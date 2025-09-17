/**
 * System Design - Architectural Patterns
 * Comprehensive examples of system architecture patterns and design principles
 */

// 1. Microservices Architecture Pattern
class MicroservicesArchitecture {
    /**
     * Service Registry Pattern
     * Central registry for service discovery and health monitoring
     */
    static serviceRegistryExample() {
        return {
            services: {
                'user-service': {
                    instances: [
                        { id: 'user-1', host: '192.168.1.10', port: 3001, health: 'healthy' },
                        { id: 'user-2', host: '192.168.1.11', port: 3001, health: 'healthy' }
                    ],
                    version: '1.2.0',
                    endpoints: ['/api/users', '/api/auth']
                },
                'order-service': {
                    instances: [
                        { id: 'order-1', host: '192.168.1.20', port: 3002, health: 'healthy' }
                    ],
                    version: '1.1.0',
                    endpoints: ['/api/orders', '/api/payments']
                },
                'notification-service': {
                    instances: [
                        { id: 'notify-1', host: '192.168.1.30', port: 3003, health: 'degraded' }
                    ],
                    version: '1.0.5',
                    endpoints: ['/api/notifications']
                }
            },
            
            // Service discovery logic
            discoverService(serviceName) {
                const service = this.services[serviceName];
                if (!service) return null;
                
                // Return healthy instances only
                const healthyInstances = service.instances.filter(
                    instance => instance.health === 'healthy'
                );
                
                // Load balancing - round robin
                const selectedInstance = healthyInstances[
                    Math.floor(Math.random() * healthyInstances.length)
                ];
                
                return selectedInstance;
            }
        };
    }

    /**
     * API Gateway Pattern
     * Single entry point for all client requests
     */
    static apiGatewayPattern() {
        return {
            // Rate limiting configuration
            rateLimiting: {
                'user-service': { requests: 1000, window: '1h' },
                'order-service': { requests: 500, window: '1h' },
                'notification-service': { requests: 200, window: '1h' }
            },

            // Authentication middleware
            authenticate(request) {
                const token = request.headers.authorization;
                if (!token) throw new Error('Authentication required');
                
                // JWT validation logic
                return this.validateJWT(token);
            },

            // Request routing
            routeRequest(request) {
                const path = request.path;
                
                if (path.startsWith('/api/users')) {
                    return this.forwardToService('user-service', request);
                } else if (path.startsWith('/api/orders')) {
                    return this.forwardToService('order-service', request);
                } else if (path.startsWith('/api/notifications')) {
                    return this.forwardToService('notification-service', request);
                }
                
                throw new Error('Route not found');
            },

            // Circuit breaker implementation
            circuitBreaker: {
                states: {}, // service -> { state, failureCount, lastFailureTime }
                
                callService(serviceName, request) {
                    const state = this.states[serviceName] || { 
                        state: 'CLOSED', 
                        failureCount: 0, 
                        lastFailureTime: null 
                    };
                    
                    if (state.state === 'OPEN') {
                        if (Date.now() - state.lastFailureTime > 60000) { // 1 minute timeout
                            state.state = 'HALF_OPEN';
                        } else {
                            throw new Error('Circuit breaker is OPEN');
                        }
                    }
                    
                    try {
                        const response = this.makeServiceCall(serviceName, request);
                        if (state.state === 'HALF_OPEN') {
                            state.state = 'CLOSED';
                            state.failureCount = 0;
                        }
                        return response;
                    } catch (error) {
                        state.failureCount++;
                        state.lastFailureTime = Date.now();
                        
                        if (state.failureCount >= 5) {
                            state.state = 'OPEN';
                        }
                        
                        this.states[serviceName] = state;
                        throw error;
                    }
                }
            }
        };
    }
}

// 2. Event-Driven Architecture
class EventDrivenArchitecture {
    /**
     * Event Sourcing Pattern
     * Store all changes as a sequence of events
     */
    static eventSourcingExample() {
        return {
            // Event store
            events: [
                { id: 1, type: 'UserCreated', aggregateId: 'user-123', data: { name: 'John', email: 'john@example.com' }, timestamp: '2024-01-01T10:00:00Z' },
                { id: 2, type: 'UserEmailUpdated', aggregateId: 'user-123', data: { email: 'john.doe@example.com' }, timestamp: '2024-01-02T10:00:00Z' },
                { id: 3, type: 'UserDeactivated', aggregateId: 'user-123', data: {}, timestamp: '2024-01-03T10:00:00Z' }
            ],

            // Event handlers
            eventHandlers: {
                'UserCreated': (state, event) => ({
                    ...state,
                    id: event.aggregateId,
                    name: event.data.name,
                    email: event.data.email,
                    active: true,
                    createdAt: event.timestamp
                }),
                
                'UserEmailUpdated': (state, event) => ({
                    ...state,
                    email: event.data.email,
                    updatedAt: event.timestamp
                }),
                
                'UserDeactivated': (state, event) => ({
                    ...state,
                    active: false,
                    deactivatedAt: event.timestamp
                })
            },

            // Rebuild aggregate from events
            rebuildAggregate(aggregateId) {
                const aggregateEvents = this.events.filter(
                    event => event.aggregateId === aggregateId
                );
                
                return aggregateEvents.reduce((state, event) => {
                    const handler = this.eventHandlers[event.type];
                    return handler ? handler(state, event) : state;
                }, {});
            },

            // Add new event
            addEvent(type, aggregateId, data) {
                const event = {
                    id: this.events.length + 1,
                    type,
                    aggregateId,
                    data,
                    timestamp: new Date().toISOString()
                };
                
                this.events.push(event);
                return event;
            }
        };
    }

    /**
     * CQRS (Command Query Responsibility Segregation) Pattern
     * Separate read and write operations
     */
    static cqrsPattern() {
        return {
            // Command side (Write operations)
            commands: {
                createUser: {
                    handler: (command) => {
                        // Validation
                        if (!command.name || !command.email) {
                            throw new Error('Name and email are required');
                        }
                        
                        // Business logic
                        const userId = `user-${Date.now()}`;
                        
                        // Generate events
                        return [{
                            type: 'UserCreated',
                            aggregateId: userId,
                            data: { name: command.name, email: command.email }
                        }];
                    }
                },
                
                updateUserEmail: {
                    handler: (command) => {
                        // Validation
                        if (!command.userId || !command.email) {
                            throw new Error('User ID and email are required');
                        }
                        
                        // Generate events
                        return [{
                            type: 'UserEmailUpdated',
                            aggregateId: command.userId,
                            data: { email: command.email }
                        }];
                    }
                }
            },

            // Query side (Read operations)
            queries: {
                // Read models optimized for specific queries
                userListView: [
                    { id: 'user-123', name: 'John Doe', email: 'john.doe@example.com', active: false },
                    { id: 'user-456', name: 'Jane Smith', email: 'jane@example.com', active: true }
                ],
                
                userDetailView: {
                    'user-123': {
                        id: 'user-123',
                        name: 'John Doe',
                        email: 'john.doe@example.com',
                        active: false,
                        createdAt: '2024-01-01T10:00:00Z',
                        updatedAt: '2024-01-02T10:00:00Z',
                        deactivatedAt: '2024-01-03T10:00:00Z',
                        totalOrders: 15,
                        lastLoginAt: '2024-01-02T15:30:00Z'
                    }
                },

                // Query handlers
                getUserList: () => this.userListView,
                getUserById: (userId) => this.userDetailView[userId],
                getActiveUsers: () => this.userListView.filter(user => user.active)
            },

            // Event projections (update read models)
            projections: {
                'UserCreated': (event) => {
                    // Update user list view
                    this.queries.userListView.push({
                        id: event.aggregateId,
                        name: event.data.name,
                        email: event.data.email,
                        active: true
                    });
                    
                    // Update user detail view
                    this.queries.userDetailView[event.aggregateId] = {
                        id: event.aggregateId,
                        name: event.data.name,
                        email: event.data.email,
                        active: true,
                        createdAt: event.timestamp,
                        totalOrders: 0
                    };
                },
                
                'UserEmailUpdated': (event) => {
                    // Update user list view
                    const userInList = this.queries.userListView.find(
                        user => user.id === event.aggregateId
                    );
                    if (userInList) {
                        userInList.email = event.data.email;
                    }
                    
                    // Update user detail view
                    const userDetail = this.queries.userDetailView[event.aggregateId];
                    if (userDetail) {
                        userDetail.email = event.data.email;
                        userDetail.updatedAt = event.timestamp;
                    }
                }
            }
        };
    }
}

// 3. Caching Strategies
class CachingStrategies {
    /**
     * Multi-level Caching Architecture
     * L1: Application cache, L2: Redis, L3: Database
     */
    static multiLevelCache() {
        return {
            // L1 Cache - In-memory application cache
            l1Cache: new Map(),
            l1MaxSize: 1000,
            l1TTL: 300000, // 5 minutes

            // L2 Cache - Redis distributed cache
            l2Cache: {
                // Simulated Redis operations
                get: async (key) => {
                    // Redis GET operation
                    console.log(`Redis GET: ${key}`);
                    return null; // Simulated cache miss
                },
                set: async (key, value, ttl) => {
                    // Redis SET operation with TTL
                    console.log(`Redis SET: ${key} (TTL: ${ttl}s)`);
                },
                del: async (key) => {
                    // Redis DELETE operation
                    console.log(`Redis DEL: ${key}`);
                }
            },

            // Cache-aside pattern implementation
            async get(key) {
                // L1 Cache check
                if (this.l1Cache.has(key)) {
                    const item = this.l1Cache.get(key);
                    if (Date.now() < item.expiry) {
                        console.log(`L1 Cache HIT: ${key}`);
                        return item.value;
                    } else {
                        this.l1Cache.delete(key);
                    }
                }

                // L2 Cache check (Redis)
                let value = await this.l2Cache.get(key);
                if (value) {
                    console.log(`L2 Cache HIT: ${key}`);
                    // Store in L1 cache
                    this.setL1(key, value);
                    return value;
                }

                // L3 - Database fetch
                console.log(`Cache MISS: ${key} - Fetching from database`);
                value = await this.fetchFromDatabase(key);
                
                if (value) {
                    // Store in both cache levels
                    await this.l2Cache.set(key, value, 3600); // 1 hour TTL
                    this.setL1(key, value);
                }

                return value;
            },

            setL1(key, value) {
                // LRU eviction if cache is full
                if (this.l1Cache.size >= this.l1MaxSize) {
                    const firstKey = this.l1Cache.keys().next().value;
                    this.l1Cache.delete(firstKey);
                }

                this.l1Cache.set(key, {
                    value,
                    expiry: Date.now() + this.l1TTL
                });
            },

            async fetchFromDatabase(key) {
                // Simulated database fetch
                return `database_value_for_${key}`;
            }
        };
    }

    /**
     * Cache Invalidation Strategies
     */
    static cacheInvalidationStrategies() {
        return {
            // Time-based expiration (TTL)
            ttlStrategy: {
                set(key, value, ttlSeconds) {
                    const expiry = Date.now() + (ttlSeconds * 1000);
                    return { key, value, expiry };
                },
                
                isExpired(item) {
                    return Date.now() > item.expiry;
                }
            },

            // Write-through cache
            writeThrough: {
                async set(key, value) {
                    // Write to database first
                    await this.writeToDatabase(key, value);
                    // Then update cache
                    await this.updateCache(key, value);
                }
            },

            // Write-behind (Write-back) cache
            writeBehind: {
                writeQueue: [],
                
                async set(key, value) {
                    // Update cache immediately
                    await this.updateCache(key, value);
                    // Queue database write
                    this.writeQueue.push({ key, value, timestamp: Date.now() });
                    
                    // Process queue asynchronously
                    this.processWriteQueue();
                },
                
                async processWriteQueue() {
                    while (this.writeQueue.length > 0) {
                        const item = this.writeQueue.shift();
                        await this.writeToDatabase(item.key, item.value);
                    }
                }
            },

            // Cache warming strategies
            cacheWarming: {
                // Preload frequently accessed data
                async warmCache() {
                    const frequentKeys = await this.getFrequentlyAccessedKeys();
                    
                    for (const key of frequentKeys) {
                        const value = await this.fetchFromDatabase(key);
                        await this.updateCache(key, value);
                    }
                },
                
                // Predictive caching based on patterns
                async predictiveWarm(userId) {
                    // Based on user behavior, preload likely needed data
                    const predictions = await this.predictUserNeeds(userId);
                    
                    for (const prediction of predictions) {
                        await this.preloadData(prediction.key);
                    }
                }
            }
        };
    }
}

// 4. Database Design Patterns
class DatabaseDesignPatterns {
    /**
     * Database Sharding Strategies
     */
    static shardingStrategies() {
        return {
            // Horizontal sharding by user ID
            userSharding: {
                getShardKey(userId) {
                    // Hash-based sharding
                    const hash = this.hashFunction(userId);
                    return hash % 4; // 4 shards
                },
                
                hashFunction(input) {
                    let hash = 0;
                    for (let i = 0; i < input.length; i++) {
                        const char = input.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash; // Convert to 32-bit integer
                    }
                    return Math.abs(hash);
                },
                
                shardConfig: {
                    0: { host: 'db-shard-0.example.com', port: 5432 },
                    1: { host: 'db-shard-1.example.com', port: 5432 },
                    2: { host: 'db-shard-2.example.com', port: 5432 },
                    3: { host: 'db-shard-3.example.com', port: 5432 }
                },
                
                routeQuery(userId, query) {
                    const shardKey = this.getShardKey(userId);
                    const shard = this.shardConfig[shardKey];
                    return { shard, query };
                }
            },

            // Geographic sharding
            geoSharding: {
                shardsByRegion: {
                    'us-east': { host: 'db-us-east.example.com', port: 5432 },
                    'us-west': { host: 'db-us-west.example.com', port: 5432 },
                    'eu-west': { host: 'db-eu-west.example.com', port: 5432 },
                    'asia-pacific': { host: 'db-ap.example.com', port: 5432 }
                },
                
                getRegionFromIP(ipAddress) {
                    // IP geolocation logic
                    if (ipAddress.startsWith('192.168.1')) return 'us-east';
                    if (ipAddress.startsWith('192.168.2')) return 'us-west';
                    if (ipAddress.startsWith('192.168.3')) return 'eu-west';
                    return 'asia-pacific';
                },
                
                routeByLocation(userIP, query) {
                    const region = this.getRegionFromIP(userIP);
                    const shard = this.shardsByRegion[region];
                    return { shard, query, region };
                }
            }
        };
    }

    /**
     * Database Replication Patterns
     */
    static replicationPatterns() {
        return {
            // Master-Slave replication
            masterSlave: {
                master: { host: 'db-master.example.com', port: 5432, role: 'write' },
                slaves: [
                    { host: 'db-slave-1.example.com', port: 5432, role: 'read', lag: 0 },
                    { host: 'db-slave-2.example.com', port: 5432, role: 'read', lag: 50 },
                    { host: 'db-slave-3.example.com', port: 5432, role: 'read', lag: 100 }
                ],
                
                routeQuery(queryType) {
                    if (queryType === 'write') {
                        return this.master;
                    }
                    
                    // Load balance read queries across slaves
                    const availableSlaves = this.slaves.filter(slave => slave.lag < 200);
                    const selectedSlave = availableSlaves[
                        Math.floor(Math.random() * availableSlaves.length)
                    ];
                    
                    return selectedSlave || this.master; // Fallback to master
                }
            },

            // Master-Master replication
            masterMaster: {
                nodes: [
                    { id: 'node-1', host: 'db-master-1.example.com', port: 5432, region: 'us-east' },
                    { id: 'node-2', host: 'db-master-2.example.com', port: 5432, region: 'eu-west' }
                ],
                
                conflictResolution: {
                    strategy: 'last-write-wins',
                    
                    resolveConflict(record1, record2) {
                        if (this.strategy === 'last-write-wins') {
                            return record1.updatedAt > record2.updatedAt ? record1 : record2;
                        }
                        // Other strategies: version vectors, application-specific logic
                    }
                },
                
                routeByRegion(userRegion) {
                    return this.nodes.find(node => node.region === userRegion) || this.nodes[0];
                }
            }
        };
    }
}

// Example usage and demonstrations
console.log("=== System Design Patterns ===");

// Microservices Architecture
console.log("\n1. Microservices Architecture:");
const serviceRegistry = MicroservicesArchitecture.serviceRegistryExample();
console.log("Discovered user service:", serviceRegistry.discoverService('user-service'));

// Event-Driven Architecture
console.log("\n2. Event Sourcing:");
const eventStore = EventDrivenArchitecture.eventSourcingExample();
console.log("User aggregate:", eventStore.rebuildAggregate('user-123'));

// Caching Strategies
console.log("\n3. Multi-level Caching:");
const cache = CachingStrategies.multiLevelCache();
// Simulated cache operations would be demonstrated here

// Database Sharding
console.log("\n4. Database Sharding:");
const sharding = DatabaseDesignPatterns.shardingStrategies();
console.log("User routing:", sharding.userSharding.routeQuery('user-12345', 'SELECT * FROM users'));

export { 
    MicroservicesArchitecture, 
    EventDrivenArchitecture, 
    CachingStrategies, 
    DatabaseDesignPatterns 
};
