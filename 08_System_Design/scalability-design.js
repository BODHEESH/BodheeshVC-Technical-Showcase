/**
 * System Design - Scalability and Performance Patterns
 * Real-world examples of scaling large distributed systems
 */

// 1. Load Balancing Strategies
class LoadBalancingStrategies {
    /**
     * Application Load Balancer with Health Checks
     */
    static applicationLoadBalancer() {
        return {
            servers: [
                { id: 'server-1', host: '192.168.1.10', port: 3000, weight: 3, healthy: true, connections: 45 },
                { id: 'server-2', host: '192.168.1.11', port: 3000, weight: 2, healthy: true, connections: 30 },
                { id: 'server-3', host: '192.168.1.12', port: 3000, weight: 1, healthy: false, connections: 0 },
                { id: 'server-4', host: '192.168.1.13', port: 3000, weight: 3, healthy: true, connections: 52 }
            ],

            algorithms: {
                // Round Robin
                roundRobin: function() {
                    this.currentIndex = (this.currentIndex || 0) % this.servers.length;
                    const server = this.servers[this.currentIndex];
                    this.currentIndex++;
                    return server.healthy ? server : this.roundRobin();
                },

                // Weighted Round Robin
                weightedRoundRobin: function() {
                    const healthyServers = this.servers.filter(s => s.healthy);
                    const totalWeight = healthyServers.reduce((sum, s) => sum + s.weight, 0);
                    
                    this.weightCounter = (this.weightCounter || 0) + 1;
                    let currentWeight = this.weightCounter % totalWeight;
                    
                    for (const server of healthyServers) {
                        currentWeight -= server.weight;
                        if (currentWeight <= 0) {
                            return server;
                        }
                    }
                    return healthyServers[0];
                },

                // Least Connections
                leastConnections: function() {
                    const healthyServers = this.servers.filter(s => s.healthy);
                    return healthyServers.reduce((min, server) => 
                        server.connections < min.connections ? server : min
                    );
                },

                // Consistent Hashing (for sticky sessions)
                consistentHashing: function(sessionId) {
                    const hash = this.hashFunction(sessionId);
                    const healthyServers = this.servers.filter(s => s.healthy);
                    const serverIndex = hash % healthyServers.length;
                    return healthyServers[serverIndex];
                }
            },

            // Health check implementation
            healthCheck: {
                interval: 30000, // 30 seconds
                timeout: 5000,   // 5 seconds
                
                async checkServer(server) {
                    try {
                        const response = await fetch(`http://${server.host}:${server.port}/health`, {
                            timeout: this.timeout
                        });
                        
                        server.healthy = response.status === 200;
                        server.lastCheck = Date.now();
                        
                        if (!server.healthy) {
                            console.log(`Server ${server.id} failed health check`);
                        }
                    } catch (error) {
                        server.healthy = false;
                        server.lastCheck = Date.now();
                        console.log(`Server ${server.id} health check error:`, error.message);
                    }
                },

                startHealthChecks() {
                    setInterval(() => {
                        this.servers.forEach(server => this.checkServer(server));
                    }, this.interval);
                }
            },

            hashFunction(input) {
                let hash = 0;
                for (let i = 0; i < input.length; i++) {
                    const char = input.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return Math.abs(hash);
            }
        };
    }
}

// 2. Auto-scaling Patterns
class AutoScalingPatterns {
    /**
     * Horizontal Pod Autoscaler (HPA) Logic
     */
    static horizontalPodAutoscaler() {
        return {
            config: {
                minReplicas: 2,
                maxReplicas: 10,
                targetCPUUtilization: 70,
                targetMemoryUtilization: 80,
                scaleUpCooldown: 300,    // 5 minutes
                scaleDownCooldown: 600,  // 10 minutes
                scaleUpThreshold: 0.8,   // Scale up if above 80%
                scaleDownThreshold: 0.3  // Scale down if below 30%
            },

            currentState: {
                replicas: 3,
                avgCPUUtilization: 45,
                avgMemoryUtilization: 60,
                lastScaleEvent: null,
                pendingRequests: 150
            },

            metrics: {
                // Simulated metrics collection
                getCPUUtilization() {
                    return Math.random() * 100; // 0-100%
                },
                
                getMemoryUtilization() {
                    return Math.random() * 100; // 0-100%
                },
                
                getRequestsPerSecond() {
                    return Math.floor(Math.random() * 1000); // 0-1000 RPS
                },
                
                getResponseTime() {
                    return Math.random() * 2000; // 0-2000ms
                }
            },

            scalingDecision() {
                const now = Date.now();
                const timeSinceLastScale = this.currentState.lastScaleEvent ? 
                    now - this.currentState.lastScaleEvent : Infinity;

                // Collect current metrics
                const cpuUtil = this.metrics.getCPUUtilization();
                const memUtil = this.metrics.getMemoryUtilization();
                const rps = this.metrics.getRequestsPerSecond();
                const responseTime = this.metrics.getResponseTime();

                // Calculate scaling factors
                const cpuFactor = cpuUtil / this.config.targetCPUUtilization;
                const memFactor = memUtil / this.config.targetMemoryUtilization;
                const maxFactor = Math.max(cpuFactor, memFactor);

                // Determine scaling action
                if (maxFactor > this.config.scaleUpThreshold && 
                    timeSinceLastScale > this.config.scaleUpCooldown * 1000) {
                    
                    const newReplicas = Math.min(
                        Math.ceil(this.currentState.replicas * maxFactor),
                        this.config.maxReplicas
                    );
                    
                    return {
                        action: 'scale-up',
                        currentReplicas: this.currentState.replicas,
                        targetReplicas: newReplicas,
                        reason: `High resource utilization: CPU ${cpuUtil.toFixed(1)}%, Memory ${memUtil.toFixed(1)}%`,
                        metrics: { cpuUtil, memUtil, rps, responseTime }
                    };
                }

                if (maxFactor < this.config.scaleDownThreshold && 
                    timeSinceLastScale > this.config.scaleDownCooldown * 1000) {
                    
                    const newReplicas = Math.max(
                        Math.floor(this.currentState.replicas * maxFactor),
                        this.config.minReplicas
                    );
                    
                    return {
                        action: 'scale-down',
                        currentReplicas: this.currentState.replicas,
                        targetReplicas: newReplicas,
                        reason: `Low resource utilization: CPU ${cpuUtil.toFixed(1)}%, Memory ${memUtil.toFixed(1)}%`,
                        metrics: { cpuUtil, memUtil, rps, responseTime }
                    };
                }

                return {
                    action: 'no-change',
                    currentReplicas: this.currentState.replicas,
                    reason: 'Metrics within acceptable range or cooldown period active',
                    metrics: { cpuUtil, memUtil, rps, responseTime }
                };
            }
        };
    }

    /**
     * Predictive Scaling based on Historical Patterns
     */
    static predictiveScaling() {
        return {
            historicalData: [
                // Hourly traffic patterns (24 hours)
                { hour: 0, avgRPS: 100, avgCPU: 20 },
                { hour: 1, avgRPS: 80, avgCPU: 15 },
                { hour: 2, avgRPS: 60, avgCPU: 12 },
                { hour: 6, avgRPS: 150, avgCPU: 30 },
                { hour: 9, avgRPS: 800, avgCPU: 75 },  // Morning peak
                { hour: 12, avgRPS: 600, avgCPU: 60 }, // Lunch peak
                { hour: 18, avgRPS: 900, avgCPU: 85 }, // Evening peak
                { hour: 22, avgRPS: 300, avgCPU: 35 }
            ],

            // Predict traffic for next hour
            predictTraffic(currentHour) {
                const historicalHour = this.historicalData.find(h => h.hour === currentHour);
                if (!historicalHour) return { predictedRPS: 200, predictedCPU: 40 };

                // Apply trend analysis and seasonal adjustments
                const dayOfWeek = new Date().getDay();
                const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
                
                return {
                    predictedRPS: Math.floor(historicalHour.avgRPS * weekendMultiplier),
                    predictedCPU: Math.floor(historicalHour.avgCPU * weekendMultiplier),
                    confidence: 0.85
                };
            },

            // Calculate required replicas based on prediction
            calculateRequiredReplicas(prediction) {
                const rpsPerReplica = 200; // Each replica can handle 200 RPS
                const cpuPerReplica = 70;  // Each replica can handle 70% CPU

                const replicasForRPS = Math.ceil(prediction.predictedRPS / rpsPerReplica);
                const replicasForCPU = Math.ceil(prediction.predictedCPU / cpuPerReplica);

                return Math.max(replicasForRPS, replicasForCPU, 2); // Minimum 2 replicas
            },

            // Proactive scaling recommendation
            getScalingRecommendation() {
                const currentHour = new Date().getHours();
                const nextHour = (currentHour + 1) % 24;
                
                const prediction = this.predictTraffic(nextHour);
                const requiredReplicas = this.calculateRequiredReplicas(prediction);
                
                return {
                    currentHour,
                    nextHour,
                    prediction,
                    recommendedReplicas: requiredReplicas,
                    scaleUpTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes ahead
                    reason: `Predicted traffic increase at ${nextHour}:00`
                };
            }
        };
    }
}

// 3. Performance Optimization Patterns
class PerformanceOptimization {
    /**
     * Database Query Optimization
     */
    static queryOptimization() {
        return {
            // Query analysis and optimization
            analyzeQuery: {
                // Slow query example
                slowQuery: `
                    SELECT u.*, p.*, o.* 
                    FROM users u 
                    LEFT JOIN profiles p ON u.id = p.user_id 
                    LEFT JOIN orders o ON u.id = o.user_id 
                    WHERE u.created_at > '2024-01-01' 
                    ORDER BY u.created_at DESC
                `,

                // Optimized query with proper indexing
                optimizedQuery: `
                    SELECT u.id, u.name, u.email, u.created_at,
                           p.avatar, p.bio,
                           COUNT(o.id) as order_count
                    FROM users u 
                    LEFT JOIN profiles p ON u.id = p.user_id 
                    LEFT JOIN orders o ON u.id = o.user_id 
                    WHERE u.created_at > '2024-01-01' 
                    GROUP BY u.id, p.id
                    ORDER BY u.created_at DESC
                    LIMIT 100
                `,

                // Required indexes
                requiredIndexes: [
                    'CREATE INDEX idx_users_created_at ON users(created_at DESC)',
                    'CREATE INDEX idx_profiles_user_id ON profiles(user_id)',
                    'CREATE INDEX idx_orders_user_id ON orders(user_id)',
                    'CREATE INDEX idx_users_composite ON users(created_at, id) INCLUDE (name, email)'
                ],

                // Query execution plan analysis
                executionPlan: {
                    before: {
                        cost: 15420.50,
                        rows: 50000,
                        executionTime: '2.3s',
                        operations: ['Seq Scan on users', 'Hash Join', 'Sort']
                    },
                    after: {
                        cost: 234.75,
                        rows: 100,
                        executionTime: '45ms',
                        operations: ['Index Scan on idx_users_created_at', 'Nested Loop', 'Limit']
                    }
                }
            },

            // Connection pooling configuration
            connectionPooling: {
                config: {
                    min: 5,           // Minimum connections
                    max: 20,          // Maximum connections
                    acquireTimeoutMillis: 30000,
                    createTimeoutMillis: 30000,
                    destroyTimeoutMillis: 5000,
                    idleTimeoutMillis: 30000,
                    reapIntervalMillis: 1000,
                    createRetryIntervalMillis: 200
                },

                // Pool monitoring
                getPoolStats() {
                    return {
                        totalConnections: 15,
                        activeConnections: 8,
                        idleConnections: 7,
                        pendingRequests: 2,
                        averageAcquireTime: 12, // ms
                        peakConnections: 18
                    };
                },

                // Connection health check
                healthCheck: {
                    query: 'SELECT 1',
                    interval: 60000, // 1 minute
                    timeout: 5000    // 5 seconds
                }
            }
        };
    }

    /**
     * API Performance Optimization
     */
    static apiOptimization() {
        return {
            // Response compression
            compression: {
                gzip: {
                    level: 6,
                    threshold: 1024, // Compress responses > 1KB
                    types: ['text/html', 'text/css', 'application/json', 'application/javascript']
                },
                
                brotli: {
                    quality: 4,
                    lgwin: 22,
                    types: ['text/html', 'text/css', 'application/json']
                }
            },

            // Request/Response optimization
            optimization: {
                // Pagination for large datasets
                pagination: {
                    defaultLimit: 20,
                    maxLimit: 100,
                    
                    buildPaginatedResponse(data, page, limit, total) {
                        const totalPages = Math.ceil(total / limit);
                        const hasNext = page < totalPages;
                        const hasPrev = page > 1;
                        
                        return {
                            data: data.slice((page - 1) * limit, page * limit),
                            pagination: {
                                page,
                                limit,
                                total,
                                totalPages,
                                hasNext,
                                hasPrev,
                                nextPage: hasNext ? page + 1 : null,
                                prevPage: hasPrev ? page - 1 : null
                            }
                        };
                    }
                },

                // Field selection (GraphQL-style)
                fieldSelection: {
                    parseFields(fieldsParam) {
                        if (!fieldsParam) return null;
                        return fieldsParam.split(',').map(field => field.trim());
                    },
                    
                    filterResponse(data, fields) {
                        if (!fields) return data;
                        
                        if (Array.isArray(data)) {
                            return data.map(item => this.selectFields(item, fields));
                        }
                        
                        return this.selectFields(data, fields);
                    },
                    
                    selectFields(obj, fields) {
                        const result = {};
                        fields.forEach(field => {
                            if (obj.hasOwnProperty(field)) {
                                result[field] = obj[field];
                            }
                        });
                        return result;
                    }
                },

                // Response caching headers
                cacheHeaders: {
                    static: {
                        'Cache-Control': 'public, max-age=31536000', // 1 year
                        'ETag': true
                    },
                    dynamic: {
                        'Cache-Control': 'private, max-age=300', // 5 minutes
                        'ETag': true,
                        'Last-Modified': true
                    },
                    api: {
                        'Cache-Control': 'private, max-age=60', // 1 minute
                        'ETag': true
                    }
                }
            },

            // Rate limiting implementation
            rateLimiting: {
                algorithms: {
                    // Token bucket algorithm
                    tokenBucket: {
                        capacity: 100,    // Maximum tokens
                        refillRate: 10,   // Tokens per second
                        tokens: 100,      // Current tokens
                        lastRefill: Date.now(),
                        
                        consume(tokensRequested = 1) {
                            this.refill();
                            
                            if (this.tokens >= tokensRequested) {
                                this.tokens -= tokensRequested;
                                return { allowed: true, remaining: this.tokens };
                            }
                            
                            return { 
                                allowed: false, 
                                remaining: this.tokens,
                                retryAfter: Math.ceil(tokensRequested / this.refillRate)
                            };
                        },
                        
                        refill() {
                            const now = Date.now();
                            const timePassed = (now - this.lastRefill) / 1000;
                            const tokensToAdd = Math.floor(timePassed * this.refillRate);
                            
                            this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
                            this.lastRefill = now;
                        }
                    },

                    // Sliding window log
                    slidingWindowLog: {
                        windowSize: 60000, // 1 minute
                        maxRequests: 100,
                        requests: [],
                        
                        isAllowed() {
                            const now = Date.now();
                            const windowStart = now - this.windowSize;
                            
                            // Remove old requests
                            this.requests = this.requests.filter(time => time > windowStart);
                            
                            if (this.requests.length < this.maxRequests) {
                                this.requests.push(now);
                                return { 
                                    allowed: true, 
                                    remaining: this.maxRequests - this.requests.length 
                                };
                            }
                            
                            return { 
                                allowed: false, 
                                remaining: 0,
                                retryAfter: Math.ceil((this.requests[0] - windowStart) / 1000)
                            };
                        }
                    }
                }
            }
        };
    }
}

// 4. Monitoring and Observability
class MonitoringObservability {
    /**
     * Distributed Tracing Implementation
     */
    static distributedTracing() {
        return {
            // Trace context propagation
            traceContext: {
                generateTraceId() {
                    return Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
                },
                
                generateSpanId() {
                    return Math.random().toString(36).substring(2, 10);
                },
                
                createSpan(operationName, parentSpanId = null) {
                    return {
                        traceId: this.currentTraceId || this.generateTraceId(),
                        spanId: this.generateSpanId(),
                        parentSpanId,
                        operationName,
                        startTime: Date.now(),
                        endTime: null,
                        tags: {},
                        logs: []
                    };
                },
                
                finishSpan(span) {
                    span.endTime = Date.now();
                    span.duration = span.endTime - span.startTime;
                    return span;
                }
            },

            // Service map generation
            serviceMap: {
                services: [
                    { name: 'api-gateway', type: 'gateway' },
                    { name: 'user-service', type: 'service' },
                    { name: 'order-service', type: 'service' },
                    { name: 'payment-service', type: 'service' },
                    { name: 'notification-service', type: 'service' },
                    { name: 'postgres-db', type: 'database' },
                    { name: 'redis-cache', type: 'cache' }
                ],
                
                dependencies: [
                    { from: 'api-gateway', to: 'user-service', calls: 1250, avgLatency: 45 },
                    { from: 'api-gateway', to: 'order-service', calls: 800, avgLatency: 120 },
                    { from: 'order-service', to: 'payment-service', calls: 600, avgLatency: 200 },
                    { from: 'order-service', to: 'user-service', calls: 400, avgLatency: 50 },
                    { from: 'payment-service', to: 'notification-service', calls: 580, avgLatency: 30 },
                    { from: 'user-service', to: 'postgres-db', calls: 2000, avgLatency: 15 },
                    { from: 'order-service', to: 'postgres-db', calls: 1200, avgLatency: 25 },
                    { from: 'user-service', to: 'redis-cache', calls: 1800, avgLatency: 5 }
                ],
                
                generateServiceMap() {
                    return {
                        nodes: this.services.map(service => ({
                            id: service.name,
                            label: service.name,
                            type: service.type,
                            health: this.getServiceHealth(service.name)
                        })),
                        edges: this.dependencies.map(dep => ({
                            source: dep.from,
                            target: dep.to,
                            weight: dep.calls,
                            latency: dep.avgLatency,
                            errorRate: this.getErrorRate(dep.from, dep.to)
                        }))
                    };
                },
                
                getServiceHealth(serviceName) {
                    // Simulated health status
                    const healthScores = {
                        'api-gateway': 0.99,
                        'user-service': 0.98,
                        'order-service': 0.95,
                        'payment-service': 0.97,
                        'notification-service': 0.92,
                        'postgres-db': 0.99,
                        'redis-cache': 0.99
                    };
                    return healthScores[serviceName] || 0.95;
                },
                
                getErrorRate(from, to) {
                    // Simulated error rates
                    return Math.random() * 0.05; // 0-5% error rate
                }
            }
        };
    }

    /**
     * Metrics Collection and Alerting
     */
    static metricsAlerting() {
        return {
            // SLI/SLO definitions
            sliSlo: {
                availability: {
                    sli: 'Percentage of successful requests',
                    slo: 99.9, // 99.9% uptime
                    errorBudget: 0.1, // 0.1% error budget
                    measurement: 'sum(successful_requests) / sum(total_requests) * 100'
                },
                
                latency: {
                    sli: '95th percentile response time',
                    slo: 200, // 200ms
                    measurement: 'histogram_quantile(0.95, http_request_duration_seconds)'
                },
                
                throughput: {
                    sli: 'Requests per second',
                    slo: 1000, // Minimum 1000 RPS capacity
                    measurement: 'rate(http_requests_total[5m])'
                }
            },

            // Alert rules
            alertRules: [
                {
                    name: 'HighErrorRate',
                    condition: 'error_rate > 0.05', // 5% error rate
                    duration: '5m',
                    severity: 'critical',
                    description: 'Error rate is above 5% for 5 minutes'
                },
                {
                    name: 'HighLatency',
                    condition: 'p95_latency > 500', // 500ms
                    duration: '2m',
                    severity: 'warning',
                    description: '95th percentile latency is above 500ms'
                },
                {
                    name: 'LowThroughput',
                    condition: 'rps < 100', // Below 100 RPS
                    duration: '10m',
                    severity: 'warning',
                    description: 'Request rate is below expected threshold'
                },
                {
                    name: 'DatabaseConnectionPoolExhausted',
                    condition: 'db_pool_active_connections / db_pool_max_connections > 0.9',
                    duration: '1m',
                    severity: 'critical',
                    description: 'Database connection pool is 90% exhausted'
                }
            ],

            // Incident response runbook
            incidentResponse: {
                severity1: {
                    description: 'Complete service outage',
                    responseTime: '5 minutes',
                    escalation: ['on-call-engineer', 'team-lead', 'engineering-manager'],
                    actions: [
                        'Check service health dashboard',
                        'Verify infrastructure status',
                        'Check recent deployments',
                        'Initiate rollback if needed',
                        'Communicate with stakeholders'
                    ]
                },
                
                severity2: {
                    description: 'Partial service degradation',
                    responseTime: '15 minutes',
                    escalation: ['on-call-engineer', 'team-lead'],
                    actions: [
                        'Identify affected components',
                        'Check resource utilization',
                        'Scale up if needed',
                        'Monitor error rates',
                        'Prepare communication'
                    ]
                }
            }
        };
    }
}

// Example usage and demonstrations
console.log("=== Scalability Design Patterns ===");

// Load Balancing
console.log("\n1. Load Balancing:");
const loadBalancer = LoadBalancingStrategies.applicationLoadBalancer();
console.log("Selected server (Round Robin):", loadBalancer.algorithms.roundRobin.call(loadBalancer));
console.log("Selected server (Least Connections):", loadBalancer.algorithms.leastConnections.call(loadBalancer));

// Auto-scaling
console.log("\n2. Auto-scaling:");
const hpa = AutoScalingPatterns.horizontalPodAutoscaler();
console.log("Scaling decision:", hpa.scalingDecision());

// Performance Optimization
console.log("\n3. Performance Optimization:");
const rateLimit = PerformanceOptimization.apiOptimization().rateLimiting.algorithms.tokenBucket;
console.log("Rate limit check:", rateLimit.consume(5));

// Monitoring
console.log("\n4. Monitoring:");
const serviceMap = MonitoringObservability.distributedTracing().serviceMap;
console.log("Service health:", serviceMap.getServiceHealth('user-service'));

export { 
    LoadBalancingStrategies, 
    AutoScalingPatterns, 
    PerformanceOptimization, 
    MonitoringObservability 
};
