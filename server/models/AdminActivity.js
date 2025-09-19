const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'issue_created',
      'issue_assigned',
      'issue_status_updated',
      'issue_priority_changed',
      'issue_rejected',
      'issue_resolved',
      'comment_added',
      'note_added',
      'department_created',
      'user_created',
      'user_updated',
      'user_deactivated'
    ]
  },
  target: {
    type: {
      type: String,
      enum: ['issue', 'user', 'department', 'system']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
adminActivitySchema.index({ admin: 1, createdAt: -1 });
adminActivitySchema.index({ action: 1, createdAt: -1 });
adminActivitySchema.index({ 'target.type': 1, 'target.id': 1 });

// Static method to log activity
adminActivitySchema.statics.logActivity = function(adminId, action, target, details = {}) {
  return this.create({
    admin: adminId,
    action,
    target,
    details,
    metadata: {
      timestamp: new Date()
    }
  });
};

module.exports = mongoose.model('AdminActivity', adminActivitySchema);
