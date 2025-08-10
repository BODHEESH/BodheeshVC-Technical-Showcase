/**
 * Socket.IO Real-time Chat Application
 * Demonstrating WebSocket communication, rooms, and real-time features
 * Author: Bodheesh VC
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// In-memory storage (use Redis in production)
const users = new Map();
const rooms = new Map();
const messages = new Map();

// 1. Socket.IO Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        socket.userId = decoded.id;
        socket.username = decoded.username;
        socket.role = decoded.role;
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
});

// 2. Connection Handler
io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.username} connected (${socket.id})`);

    // Store user information
    users.set(socket.userId, {
        id: socket.userId,
        username: socket.username,
        socketId: socket.id,
        status: 'online',
        joinedAt: new Date(),
        currentRoom: null
    });

    // 3. User Presence Management
    socket.emit('user_connected', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date()
    });

    // Broadcast user online status
    socket.broadcast.emit('user_status_changed', {
        userId: socket.userId,
        username: socket.username,
        status: 'online'
    });

    // 4. Room Management
    socket.on('join_room', (data) => {
        const { roomId, roomName } = data;
        
        // Leave current room if any
        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);
            socket.to(socket.currentRoom).emit('user_left_room', {
                userId: socket.userId,
                username: socket.username,
                roomId: socket.currentRoom
            });
        }

        // Join new room
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Update user's current room
        const user = users.get(socket.userId);
        if (user) {
            user.currentRoom = roomId;
        }

        // Create or update room
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                id: roomId,
                name: roomName,
                members: new Set(),
                createdAt: new Date(),
                messageCount: 0
            });
        }

        const room = rooms.get(roomId);
        room.members.add(socket.userId);

        // Notify room members
        socket.to(roomId).emit('user_joined_room', {
            userId: socket.userId,
            username: socket.username,
            roomId,
            roomName
        });

        // Send room info to user
        socket.emit('room_joined', {
            roomId,
            roomName,
            memberCount: room.members.size,
            members: Array.from(room.members).map(userId => {
                const user = users.get(userId);
                return user ? { id: user.id, username: user.username } : null;
            }).filter(Boolean)
        });

        console.log(`👥 ${socket.username} joined room: ${roomName}`);
    });

    // 5. Message Handling
    socket.on('send_message', (data) => {
        const { roomId, message, type = 'text' } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
            socket.emit('error', { message: 'You must be in the room to send messages' });
            return;
        }

        const messageData = {
            id: Date.now().toString(),
            userId: socket.userId,
            username: socket.username,
            message,
            type,
            roomId,
            timestamp: new Date(),
            edited: false,
            reactions: new Map()
        };

        // Store message
        if (!messages.has(roomId)) {
            messages.set(roomId, []);
        }
        messages.get(roomId).push(messageData);

        // Update room message count
        const room = rooms.get(roomId);
        if (room) {
            room.messageCount++;
        }

        // Broadcast message to room
        io.to(roomId).emit('new_message', {
            ...messageData,
            reactions: Array.from(messageData.reactions.entries())
        });

        console.log(`💬 Message from ${socket.username} in ${roomId}: ${message}`);
    });

    // 6. Private Messaging
    socket.on('send_private_message', (data) => {
        const { recipientId, message } = data;
        const recipient = users.get(recipientId);

        if (!recipient) {
            socket.emit('error', { message: 'Recipient not found' });
            return;
        }

        const messageData = {
            id: Date.now().toString(),
            senderId: socket.userId,
            senderUsername: socket.username,
            recipientId,
            message,
            timestamp: new Date(),
            isPrivate: true
        };

        // Send to recipient
        io.to(recipient.socketId).emit('private_message', messageData);
        
        // Send confirmation to sender
        socket.emit('private_message_sent', messageData);

        console.log(`📨 Private message: ${socket.username} -> ${recipient.username}`);
    });

    // 7. Typing Indicators
    socket.on('typing_start', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('user_typing', {
            userId: socket.userId,
            username: socket.username,
            roomId
        });
    });

    socket.on('typing_stop', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('user_stopped_typing', {
            userId: socket.userId,
            username: socket.username,
            roomId
        });
    });

    // 8. Message Reactions
    socket.on('add_reaction', (data) => {
        const { messageId, roomId, emoji } = data;
        const roomMessages = messages.get(roomId);
        
        if (roomMessages) {
            const message = roomMessages.find(msg => msg.id === messageId);
            if (message) {
                if (!message.reactions.has(emoji)) {
                    message.reactions.set(emoji, new Set());
                }
                message.reactions.get(emoji).add(socket.userId);

                // Broadcast reaction update
                io.to(roomId).emit('reaction_added', {
                    messageId,
                    emoji,
                    userId: socket.userId,
                    username: socket.username,
                    reactionCount: message.reactions.get(emoji).size
                });
            }
        }
    });

    // 9. File Sharing
    socket.on('share_file', (data) => {
        const { roomId, fileName, fileSize, fileType, fileData } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
            socket.emit('error', { message: 'You must be in the room to share files' });
            return;
        }

        const fileMessage = {
            id: Date.now().toString(),
            userId: socket.userId,
            username: socket.username,
            type: 'file',
            fileName,
            fileSize,
            fileType,
            fileUrl: `/uploads/${fileName}`, // In production, upload to S3
            roomId,
            timestamp: new Date()
        };

        // Store file message
        if (!messages.has(roomId)) {
            messages.set(roomId, []);
        }
        messages.get(roomId).push(fileMessage);

        // Broadcast file share
        io.to(roomId).emit('file_shared', fileMessage);

        console.log(`📎 File shared by ${socket.username}: ${fileName}`);
    });

    // 10. Voice/Video Call Signaling
    socket.on('call_user', (data) => {
        const { recipientId, offer, callType } = data;
        const recipient = users.get(recipientId);

        if (recipient) {
            io.to(recipient.socketId).emit('incoming_call', {
                callerId: socket.userId,
                callerUsername: socket.username,
                offer,
                callType
            });
        }
    });

    socket.on('answer_call', (data) => {
        const { callerId, answer } = data;
        const caller = users.get(callerId);

        if (caller) {
            io.to(caller.socketId).emit('call_answered', {
                answer,
                answeredBy: socket.userId
            });
        }
    });

    socket.on('ice_candidate', (data) => {
        const { recipientId, candidate } = data;
        const recipient = users.get(recipientId);

        if (recipient) {
            io.to(recipient.socketId).emit('ice_candidate', {
                candidate,
                senderId: socket.userId
            });
        }
    });

    // 11. Admin Functions
    socket.on('get_room_stats', (data) => {
        if (socket.role !== 'admin') {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }

        const { roomId } = data;
        const room = rooms.get(roomId);
        const roomMessages = messages.get(roomId) || [];

        if (room) {
            socket.emit('room_stats', {
                roomId,
                memberCount: room.members.size,
                messageCount: roomMessages.length,
                createdAt: room.createdAt,
                lastActivity: roomMessages.length > 0 ? 
                    roomMessages[roomMessages.length - 1].timestamp : room.createdAt
            });
        }
    });

    // 12. Disconnect Handler
    socket.on('disconnect', (reason) => {
        console.log(`🔌 User ${socket.username} disconnected: ${reason}`);

        // Update user status
        const user = users.get(socket.userId);
        if (user) {
            user.status = 'offline';
            user.lastSeen = new Date();
        }

        // Leave current room
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('user_left_room', {
                userId: socket.userId,
                username: socket.username,
                roomId: socket.currentRoom
            });

            // Remove from room members
            const room = rooms.get(socket.currentRoom);
            if (room) {
                room.members.delete(socket.userId);
            }
        }

        // Broadcast offline status
        socket.broadcast.emit('user_status_changed', {
            userId: socket.userId,
            username: socket.username,
            status: 'offline'
        });

        // Clean up if no more connections
        setTimeout(() => {
            const hasActiveConnection = Array.from(io.sockets.sockets.values())
                .some(s => s.userId === socket.userId);
            
            if (!hasActiveConnection) {
                users.delete(socket.userId);
            }
        }, 5000);
    });
});

// 13. REST API Endpoints
app.get('/api/rooms', (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        name: room.name,
        memberCount: room.members.size,
        messageCount: room.messageCount,
        createdAt: room.createdAt
    }));

    res.json({
        success: true,
        data: { rooms: roomList }
    });
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const roomMessages = messages.get(roomId) || [];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMessages = roomMessages.slice(startIndex, endIndex);

    res.json({
        success: true,
        data: {
            messages: paginatedMessages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: roomMessages.length
            }
        }
    });
});

app.get('/api/users/online', (req, res) => {
    const onlineUsers = Array.from(users.values())
        .filter(user => user.status === 'online')
        .map(user => ({
            id: user.id,
            username: user.username,
            currentRoom: user.currentRoom,
            joinedAt: user.joinedAt
        }));

    res.json({
        success: true,
        data: { users: onlineUsers }
    });
});

// 14. Performance Monitoring
setInterval(() => {
    const stats = {
        connectedUsers: users.size,
        activeRooms: rooms.size,
        totalMessages: Array.from(messages.values()).reduce((total, msgs) => total + msgs.length, 0),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
    };

    console.log('📊 Server Stats:', stats);
    
    // Emit stats to admin users
    io.emit('server_stats', stats);
}, 60000); // Every minute

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Socket.IO Chat Server running on port ${PORT}`);
    console.log(`💬 Chat URL: http://localhost:${PORT}`);
});

module.exports = { app, server, io };
