const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.set('trust proxy', 1); // Trust first proxy for rate limiting
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/admin/users', require('./routes/userManagement'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/user', require('./routes/userDashboard'));
app.use('/api/community', require('./routes/community'));
app.use('/api/crowdfunding', require('./routes/crowdfunding'));
app.use('/api/funding', require('./routes/funding'));
app.use('/api/announcements', require('./routes/announcements'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-issue', (issueId) => {
    socket.join(`issue-${issueId}`);
  });
  
  socket.on('leave-issue', (issueId) => {
    socket.leave(`issue-${issueId}`);
  });

  // Chat events
  socket.on('join-chat', (conversationId) => {
    socket.join(`chat-${conversationId}`);
    console.log(`User joined chat: ${conversationId}`);
  });

  socket.on('leave-chat', (conversationId) => {
    socket.leave(`chat-${conversationId}`);
    console.log(`User left chat: ${conversationId}`);
  });

  socket.on('typing', (data) => {
    socket.to(`chat-${data.conversationId}`).emit('user-typing', {
      userId: data.userId,
      isTyping: data.isTyping
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(`chat-${data.conversationId}`).emit('user-stopped-typing', {
      userId: data.userId
    });
  });

  // Announcement audience rooms
  socket.on('join-audience', (audience) => {
    socket.join(`audience-${audience}`);
    console.log(`User joined audience: ${audience}`);
  });

  socket.on('leave-audience', (audience) => {
    socket.leave(`audience-${audience}`);
    console.log(`User left audience: ${audience}`);
  });

  // Admin room for monitoring
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('Admin joined admin room');
  });

  socket.on('leave-admin', () => {
    socket.leave('admin-room');
    console.log('Admin left admin room');
  });
  
  // Funding events
  socket.on('join-funding', (campaignId) => {
    socket.join(`funding-${campaignId}`);
    console.log(`User joined funding campaign: ${campaignId}`);
  });

  socket.on('leave-funding', (campaignId) => {
    socket.leave(`funding-${campaignId}`);
    console.log(`User left funding campaign: ${campaignId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to emit issue updates
const emitIssueUpdate = (issueId, updatedData) => {
  io.to(`issue-${issueId}`).emit('issue_update', {
    issueId,
    ...updatedData,
    timestamp: new Date()
  });
  
  // Also emit to user's personal room for dashboard updates
  if (updatedData.reportedBy) {
    io.to(`user-${updatedData.reportedBy}`).emit('issue_update', {
      issueId,
      ...updatedData,
      timestamp: new Date()
    });
  }
};

// Helper function to emit funding updates
const emitFundingUpdate = (campaignId, updatedData) => {
  io.to(`funding-${campaignId}`).emit('funding_update', {
    campaignId,
    ...updatedData,
    timestamp: new Date()
  });
  
  // Also emit to all users for general funding updates
  io.emit('funding_update', {
    campaignId,
    ...updatedData,
    timestamp: new Date()
  });
};

// Helper function to emit user notifications
const emitUserNotification = (userId, notification) => {
  io.to(`user-${userId}`).emit('notification', notification);
};

// Make functions available globally
global.emitIssueUpdate = emitIssueUpdate;
global.emitUserNotification = emitUserNotification;

// Make io and helper functions available to routes
app.set('io', io);
app.set('emitIssueUpdate', emitIssueUpdate);
app.set('emitFundingUpdate', emitFundingUpdate);
app.set('emitUserNotification', emitUserNotification);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jharkhand-civic')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };
