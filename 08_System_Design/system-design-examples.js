/**
 * System Design - Real-world System Examples
 * Complete system designs for common applications
 */

// 1. Social Media Platform Design (Twitter-like)
class SocialMediaPlatform {
    /**
     * Complete system architecture for a Twitter-like platform
     */
    static getArchitecture() {
        return {
            // System requirements
            requirements: {
                functional: [
                    'Users can post tweets (280 characters)',
                    'Users can follow other users',
                    'Users can like and retweet posts',
                    'Real-time timeline updates',
                    'Search functionality',
                    'Direct messaging',
                    'Media uploads (images, videos)'
                ],
                nonFunctional: [
                    '100M daily active users',
                    '500M tweets per day',
                    '99.9% availability',
                    '<200ms response time for timeline',
                    'Global distribution'
                ]
            },

            // Capacity estimation
            capacityEstimation: {
                users: {
                    total: 1000000000, // 1B total users
                    dailyActive: 100000000, // 100M DAU
                    tweetsPerUser: 5, // Average tweets per day
                    followersPerUser: 200 // Average followers
                },
                
                storage: {
                    tweetSize: 300, // bytes (280 chars + metadata)
                    mediaSize: 2000000, // 2MB average
                    tweetsPerDay: 500000000, // 500M tweets/day
                    dailyStorage: '150GB text + 200TB media',
                    yearlyStorage: '55TB text + 73PB media'
                },
                
                bandwidth: {
                    readWriteRatio: '100:1',
                    tweetsPerSecond: 5787, // 500M / 86400
                    timelineReads: 578700, // 100x write rate
                    peakTraffic: '10x average = 57,870 writes/sec, 5.8M reads/sec'
                }
            },

            // System components
            components: {
                // API Gateway
                apiGateway: {
                    technology: 'Kong/AWS API Gateway',
                    responsibilities: [
                        'Authentication & authorization',
                        'Rate limiting',
                        'Request routing',
                        'SSL termination',
                        'API versioning'
                    ],
                    scalability: 'Multiple instances behind load balancer'
                },

                // Core services
                services: {
                    userService: {
                        responsibilities: ['User management', 'Profile data', 'Authentication'],
                        database: 'PostgreSQL (user profiles) + Redis (sessions)',
                        caching: 'User profile cache, session cache'
                    },
                    
                    tweetService: {
                        responsibilities: ['Tweet creation', 'Tweet metadata', 'Media handling'],
                        database: 'Cassandra (tweets) + S3 (media)',
                        sharding: 'By user_id hash'
                    },
                    
                    timelineService: {
                        responsibilities: ['Home timeline', 'User timeline', 'Timeline generation'],
                        database: 'Redis (timeline cache) + Cassandra (backup)',
                        patterns: ['Fan-out on write', 'Fan-out on read for celebrities']
                    },
                    
                    followService: {
                        responsibilities: ['Follow/unfollow', 'Follower lists', 'Following lists'],
                        database: 'Neo4j (graph) + Redis (cache)',
                        optimization: 'Bidirectional relationships'
                    },
                    
                    searchService: {
                        responsibilities: ['Tweet search', 'User search', 'Trending topics'],
                        database: 'Elasticsearch',
                        indexing: 'Real-time tweet indexing'
                    },
                    
                    notificationService: {
                        responsibilities: ['Push notifications', 'Email notifications', 'In-app notifications'],
                        database: 'MongoDB',
                        delivery: 'Apache Kafka + WebSockets'
                    }
                },

                // Data storage
                databases: {
                    postgresql: {
                        usage: 'User profiles, account data',
                        sharding: 'By user_id',
                        replication: 'Master-slave with read replicas'
                    },
                    
                    cassandra: {
                        usage: 'Tweets, timelines, activity feeds',
                        partitioning: 'By user_id and timestamp',
                        replication: 'RF=3 across multiple DCs'
                    },
                    
                    redis: {
                        usage: 'Timeline cache, session cache, counters',
                        clustering: 'Redis Cluster with consistent hashing',
                        persistence: 'RDB + AOF'
                    },
                    
                    elasticsearch: {
                        usage: 'Search index, analytics',
                        sharding: 'By date and content hash',
                        replication: '2 replicas per shard'
                    }
                }
            },

            // Timeline generation strategies
            timelineGeneration: {
                // Fan-out on write (Push model)
                fanOutOnWrite: {
                    description: 'Pre-compute timelines when tweet is posted',
                    process: [
                        'User posts tweet',
                        'Get user\'s followers list',
                        'Insert tweet into each follower\'s timeline',
                        'Store in Redis timeline cache'
                    ],
                    pros: ['Fast timeline reads', 'Good for normal users'],
                    cons: ['Expensive for celebrities', 'Storage overhead'],
                    implementation: `
                        async function fanOutOnWrite(userId, tweet) {
                            const followers = await getFollowers(userId);
                            const promises = followers.map(followerId => 
                                insertIntoTimeline(followerId, tweet)
                            );
                            await Promise.all(promises);
                        }
                    `
                },

                // Fan-out on read (Pull model)
                fanOutOnRead: {
                    description: 'Compute timeline when user requests it',
                    process: [
                        'User requests timeline',
                        'Get list of users they follow',
                        'Fetch recent tweets from each',
                        'Merge and sort by timestamp',
                        'Cache result'
                    ],
                    pros: ['No storage overhead', 'Good for celebrities'],
                    cons: ['Slower timeline generation', 'Complex merging'],
                    implementation: `
                        async function fanOutOnRead(userId) {
                            const following = await getFollowing(userId);
                            const tweetPromises = following.map(followeeId => 
                                getRecentTweets(followeeId, 100)
                            );
                            const allTweets = await Promise.all(tweetPromises);
                            return mergeAndSort(allTweets.flat());
                        }
                    `
                },

                // Hybrid approach
                hybridApproach: {
                    description: 'Combine both strategies based on user type',
                    strategy: [
                        'Normal users: Fan-out on write',
                        'Celebrities (>1M followers): Fan-out on read',
                        'Mixed timelines: Merge pre-computed + real-time'
                    ],
                    implementation: `
                        async function generateTimeline(userId) {
                            // Get pre-computed timeline (fan-out on write)
                            const preComputed = await getPreComputedTimeline(userId);
                            
                            // Get tweets from celebrities (fan-out on read)
                            const celebrities = await getCelebritiesFollowed(userId);
                            const celebrityTweets = await fetchCelebrityTweets(celebrities);
                            
                            // Merge and return
                            return mergeTimelines(preComputed, celebrityTweets);
                        }
                    `
                }
            }
        };
    }
}

// 2. Chat Application Design (WhatsApp-like)
class ChatApplication {
    /**
     * Real-time messaging system architecture
     */
    static getArchitecture() {
        return {
            requirements: {
                functional: [
                    'One-on-one messaging',
                    'Group messaging (up to 256 members)',
                    'Media sharing (images, videos, documents)',
                    'Message delivery status (sent, delivered, read)',
                    'Online/offline status',
                    'Message encryption',
                    'Message history'
                ],
                nonFunctional: [
                    '2B users worldwide',
                    '100B messages per day',
                    '<100ms message delivery',
                    '99.99% availability',
                    'End-to-end encryption'
                ]
            },

            // WebSocket connection management
            connectionManagement: {
                architecture: 'Multiple WebSocket servers behind load balancer',
                
                connectionServer: {
                    responsibilities: [
                        'Maintain WebSocket connections',
                        'Handle connection lifecycle',
                        'Route messages to appropriate handlers',
                        'Manage user presence'
                    ],
                    
                    implementation: `
                        class ConnectionServer {
                            constructor() {
                                this.connections = new Map(); // userId -> WebSocket
                                this.userSessions = new Map(); // userId -> sessionInfo
                            }
                            
                            handleConnection(ws, userId) {
                                this.connections.set(userId, ws);
                                this.userSessions.set(userId, {
                                    connectedAt: Date.now(),
                                    serverId: process.env.SERVER_ID,
                                    lastActivity: Date.now()
                                });
                                
                                // Update user presence
                                this.updatePresence(userId, 'online');
                                
                                ws.on('message', (data) => {
                                    this.handleMessage(userId, JSON.parse(data));
                                });
                                
                                ws.on('close', () => {
                                    this.handleDisconnection(userId);
                                });
                            }
                            
                            async handleMessage(senderId, message) {
                                const { type, recipientId, content, messageId } = message;
                                
                                // Store message
                                await this.storeMessage({
                                    id: messageId,
                                    senderId,
                                    recipientId,
                                    content,
                                    timestamp: Date.now(),
                                    type
                                });
                                
                                // Deliver message
                                await this.deliverMessage(recipientId, {
                                    messageId,
                                    senderId,
                                    content,
                                    timestamp: Date.now()
                                });
                                
                                // Send delivery confirmation
                                this.sendDeliveryStatus(senderId, messageId, 'sent');
                            }
                        }
                    `
                },

                // Message routing
                messageRouting: {
                    strategy: 'Consistent hashing based on user ID',
                    implementation: `
                        class MessageRouter {
                            constructor() {
                                this.servers = [
                                    { id: 'ws-1', host: '192.168.1.10' },
                                    { id: 'ws-2', host: '192.168.1.11' },
                                    { id: 'ws-3', host: '192.168.1.12' }
                                ];
                            }
                            
                            getServerForUser(userId) {
                                const hash = this.hashFunction(userId);
                                const serverIndex = hash % this.servers.length;
                                return this.servers[serverIndex];
                            }
                            
                            async routeMessage(recipientId, message) {
                                const server = this.getServerForUser(recipientId);
                                
                                if (server.id === process.env.SERVER_ID) {
                                    // Local delivery
                                    return this.deliverLocally(recipientId, message);
                                } else {
                                    // Remote delivery via message queue
                                    return this.deliverRemotely(server, recipientId, message);
                                }
                            }
                        }
                    `
                }
            },

            // Message storage and retrieval
            messageStorage: {
                database: 'Cassandra for horizontal scaling',
                schema: `
                    CREATE TABLE messages (
                        conversation_id UUID,
                        message_id TIMEUUID,
                        sender_id UUID,
                        recipient_id UUID,
                        content TEXT,
                        message_type VARCHAR,
                        created_at TIMESTAMP,
                        delivered_at TIMESTAMP,
                        read_at TIMESTAMP,
                        PRIMARY KEY (conversation_id, message_id)
                    ) WITH CLUSTERING ORDER BY (message_id DESC);
                    
                    CREATE TABLE user_conversations (
                        user_id UUID,
                        conversation_id UUID,
                        last_message_id TIMEUUID,
                        last_activity TIMESTAMP,
                        unread_count INT,
                        PRIMARY KEY (user_id, last_activity, conversation_id)
                    ) WITH CLUSTERING ORDER BY (last_activity DESC);
                `,
                
                partitioning: 'By conversation_id to keep related messages together',
                
                messageRetrieval: `
                    async function getMessageHistory(conversationId, limit = 50, beforeMessageId = null) {
                        let query = 'SELECT * FROM messages WHERE conversation_id = ?';
                        const params = [conversationId];
                        
                        if (beforeMessageId) {
                            query += ' AND message_id < ?';
                            params.push(beforeMessageId);
                        }
                        
                        query += ' ORDER BY message_id DESC LIMIT ?';
                        params.push(limit);
                        
                        return await cassandra.execute(query, params);
                    }
                `
            },

            // Group messaging
            groupMessaging: {
                architecture: 'Separate group service with member management',
                
                groupService: {
                    responsibilities: [
                        'Group creation and management',
                        'Member addition/removal',
                        'Permission management',
                        'Group metadata'
                    ],
                    
                    messageDelivery: `
                        async function deliverGroupMessage(groupId, message) {
                            // Get group members
                            const members = await getGroupMembers(groupId);
                            
                            // Fan-out to all members
                            const deliveryPromises = members.map(async (memberId) => {
                                if (memberId !== message.senderId) {
                                    await this.deliverMessage(memberId, {
                                        ...message,
                                        groupId,
                                        isGroupMessage: true
                                    });
                                }
                            });
                            
                            await Promise.all(deliveryPromises);
                            
                            // Update group's last activity
                            await updateGroupActivity(groupId, message.timestamp);
                        }
                    `
                }
            },

            // Presence and status
            presenceService: {
                storage: 'Redis for real-time updates',
                
                implementation: `
                    class PresenceService {
                        constructor() {
                            this.redis = new Redis();
                        }
                        
                        async updatePresence(userId, status) {
                            const key = \`presence:\${userId}\`;
                            await this.redis.hset(key, {
                                status, // online, offline, away
                                lastSeen: Date.now(),
                                serverId: process.env.SERVER_ID
                            });
                            
                            // Set expiration for auto-cleanup
                            await this.redis.expire(key, 300); // 5 minutes
                            
                            // Notify contacts about status change
                            await this.notifyContacts(userId, status);
                        }
                        
                        async getPresence(userId) {
                            const key = \`presence:\${userId}\`;
                            const presence = await this.redis.hgetall(key);
                            
                            if (!presence.status) {
                                return { status: 'offline', lastSeen: null };
                            }
                            
                            return {
                                status: presence.status,
                                lastSeen: parseInt(presence.lastSeen)
                            };
                        }
                    }
                `
            }
        };
    }
}

// 3. Video Streaming Platform (YouTube-like)
class VideoStreamingPlatform {
    /**
     * Video streaming and content delivery system
     */
    static getArchitecture() {
        return {
            requirements: {
                functional: [
                    'Video upload and processing',
                    'Multiple quality streaming (360p, 720p, 1080p, 4K)',
                    'Video search and recommendations',
                    'Comments and likes',
                    'User subscriptions',
                    'Live streaming',
                    'Analytics and monetization'
                ],
                nonFunctional: [
                    '2B users, 1B hours watched daily',
                    '500 hours uploaded per minute',
                    '<2s video start time',
                    '99.9% availability',
                    'Global CDN distribution'
                ]
            },

            // Video processing pipeline
            videoProcessing: {
                uploadFlow: [
                    'User uploads video to S3',
                    'Trigger video processing pipeline',
                    'Extract metadata and thumbnails',
                    'Transcode to multiple formats/qualities',
                    'Generate adaptive bitrate streams',
                    'Upload processed files to CDN',
                    'Update database with video info',
                    'Notify user of completion'
                ],
                
                transcoding: {
                    technology: 'FFmpeg on Kubernetes',
                    formats: ['MP4', 'WebM', 'HLS'],
                    qualities: [
                        { resolution: '360p', bitrate: '1Mbps' },
                        { resolution: '720p', bitrate: '2.5Mbps' },
                        { resolution: '1080p', bitrate: '5Mbps' },
                        { resolution: '4K', bitrate: '15Mbps' }
                    ],
                    
                    implementation: `
                        class VideoProcessor {
                            async processVideo(videoId, inputPath) {
                                const job = {
                                    videoId,
                                    inputPath,
                                    status: 'processing',
                                    createdAt: Date.now()
                                };
                                
                                try {
                                    // Extract metadata
                                    const metadata = await this.extractMetadata(inputPath);
                                    
                                    // Generate thumbnails
                                    const thumbnails = await this.generateThumbnails(inputPath);
                                    
                                    // Transcode to multiple qualities
                                    const transcodingJobs = this.qualities.map(quality => 
                                        this.transcodeVideo(inputPath, quality)
                                    );
                                    
                                    const transcodedFiles = await Promise.all(transcodingJobs);
                                    
                                    // Upload to CDN
                                    await this.uploadToCDN(videoId, transcodedFiles, thumbnails);
                                    
                                    // Update database
                                    await this.updateVideoStatus(videoId, 'completed', {
                                        metadata,
                                        thumbnails,
                                        qualities: this.qualities
                                    });
                                    
                                } catch (error) {
                                    await this.updateVideoStatus(videoId, 'failed', { error: error.message });
                                }
                            }
                        }
                    `
                }
            },

            // Content Delivery Network
            cdn: {
                architecture: 'Multi-tier CDN with edge locations',
                
                tiers: {
                    edge: {
                        description: 'Closest to users, cache popular content',
                        locations: '200+ global edge locations',
                        cachePolicy: 'LRU with popularity scoring'
                    },
                    
                    regional: {
                        description: 'Regional data centers, larger cache',
                        locations: '20+ regional centers',
                        cachePolicy: 'Store content for entire region'
                    },
                    
                    origin: {
                        description: 'Source of truth for all content',
                        locations: '3-5 origin servers',
                        storage: 'Distributed object storage'
                    }
                },
                
                adaptiveStreaming: {
                    protocol: 'HLS (HTTP Live Streaming)',
                    implementation: `
                        class AdaptiveStreaming {
                            generateManifest(videoId, qualities) {
                                const manifest = {
                                    version: 3,
                                    targetDuration: 10,
                                    mediaSequence: 0,
                                    playlists: qualities.map(quality => ({
                                        uri: \`\${videoId}/\${quality.resolution}/playlist.m3u8\`,
                                        bandwidth: quality.bitrate * 1000,
                                        resolution: quality.resolution,
                                        codecs: 'avc1.42E01E,mp4a.40.2'
                                    }))
                                };
                                
                                return this.formatM3U8(manifest);
                            }
                            
                            selectQuality(availableBandwidth, screenSize) {
                                // Adaptive bitrate logic
                                const suitableQualities = this.qualities.filter(q => 
                                    q.bitrate <= availableBandwidth * 0.8 && // 80% of available bandwidth
                                    this.getResolutionPixels(q.resolution) <= screenSize
                                );
                                
                                return suitableQualities[suitableQualities.length - 1] || this.qualities[0];
                            }
                        }
                    `
                }
            },

            // Recommendation system
            recommendationSystem: {
                approaches: [
                    'Collaborative filtering',
                    'Content-based filtering',
                    'Deep learning models',
                    'Real-time personalization'
                ],
                
                implementation: `
                    class RecommendationEngine {
                        async getRecommendations(userId, limit = 20) {
                            // Get user's watch history and preferences
                            const userProfile = await this.getUserProfile(userId);
                            
                            // Collaborative filtering
                            const collaborativeRecs = await this.collaborativeFiltering(userId);
                            
                            // Content-based filtering
                            const contentRecs = await this.contentBasedFiltering(userProfile);
                            
                            // Trending videos
                            const trendingRecs = await this.getTrendingVideos();
                            
                            // Combine and rank recommendations
                            const combinedRecs = this.combineRecommendations([
                                { source: 'collaborative', weight: 0.4, items: collaborativeRecs },
                                { source: 'content', weight: 0.3, items: contentRecs },
                                { source: 'trending', weight: 0.3, items: trendingRecs }
                            ]);
                            
                            // Apply diversity and freshness filters
                            return this.diversifyRecommendations(combinedRecs, limit);
                        }
                        
                        async updateUserInteraction(userId, videoId, interaction) {
                            // Update user profile based on interaction
                            await this.updateUserProfile(userId, {
                                videoId,
                                interaction, // view, like, share, subscribe
                                timestamp: Date.now()
                            });
                            
                            // Update real-time recommendation models
                            await this.updateRealtimeModel(userId, videoId, interaction);
                        }
                    }
                `
            }
        };
    }
}

// Example usage and demonstrations
console.log("=== System Design Examples ===");

// Social Media Platform
console.log("\n1. Social Media Platform:");
const socialMedia = SocialMediaPlatform.getArchitecture();
console.log("Capacity estimation:", socialMedia.capacityEstimation.storage);
console.log("Timeline strategy:", socialMedia.timelineGeneration.hybridApproach.description);

// Chat Application
console.log("\n2. Chat Application:");
const chatApp = ChatApplication.getArchitecture();
console.log("Message routing strategy:", chatApp.connectionManagement.messageRouting.strategy);

// Video Streaming
console.log("\n3. Video Streaming Platform:");
const videoStreaming = VideoStreamingPlatform.getArchitecture();
console.log("CDN architecture:", videoStreaming.cdn.tiers.edge.description);

export { SocialMediaPlatform, ChatApplication, VideoStreamingPlatform };
