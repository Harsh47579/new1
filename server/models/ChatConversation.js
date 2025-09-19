const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: String,
    enum: ['user', 'ai', 'admin'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Not required for AI messages
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const chatConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    unique: true
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ['active', 'resolved', 'closed'],
    default: 'active'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatConversationSchema.index({ userId: 1, lastMessageAt: -1 });
chatConversationSchema.index({ conversationId: 1 });
chatConversationSchema.index({ status: 1, isActive: 1 });

// Virtual for unread message count
chatConversationSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(msg => 
    msg.sender !== 'user' && !msg.isRead
  ).length;
});

// Method to add a message
chatConversationSchema.methods.addMessage = function(content, sender, senderId = null, metadata = {}) {
  const message = {
    content,
    sender,
    senderId,
    timestamp: new Date(),
    metadata
  };
  
  this.messages.push(message);
  this.lastMessageAt = new Date();
  
  return this.save();
};

// Method to mark messages as read
chatConversationSchema.methods.markAsRead = function() {
  this.messages.forEach(msg => {
    if (msg.sender !== 'user') {
      msg.isRead = true;
    }
  });
  return this.save();
};

// Static method to find or create conversation
chatConversationSchema.statics.findOrCreate = async function(userId) {
  let conversation = await this.findOne({ 
    userId, 
    isActive: true 
  }).sort({ lastMessageAt: -1 });
  
  if (!conversation) {
    const conversationId = `conv_${userId}_${Date.now()}`;
    conversation = new this({
      userId,
      conversationId,
      messages: []
    });
    await conversation.save();
  }
  
  return conversation;
};

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
