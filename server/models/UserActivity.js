const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'register',
      'profile_update',
      'password_change',
      'issue_report',
      'issue_update',
      'issue_comment',
      'issue_upvote',
      'issue_confirm',
      'issue_assign',
      'issue_resolve',
      'issue_close',
      'user_create',
      'user_update',
      'user_delete',
      'user_suspend',
      'user_ban',
      'user_warn',
      'user_flag',
      'department_create',
      'department_update',
      'department_delete',
      'permission_change',
      'role_change',
      'system_access',
      'data_export',
      'data_import',
      'settings_change',
      'notification_sent',
      'notification_read',
      'search_performed',
      'filter_applied',
      'report_generated',
      'api_call',
      'file_upload',
      'file_download',
      'other'
    ]
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    },
    address: String,
    city: String,
    state: String,
    country: String
  },
  resourceType: {
    type: String,
    enum: ['user', 'issue', 'department', 'notification', 'system', 'file', 'report', 'other']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending', 'cancelled'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  deviceInfo: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String,
    version: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
userActivitySchema.index({ userId: 1, createdAt: -1 });
userActivitySchema.index({ action: 1, createdAt: -1 });
userActivitySchema.index({ resourceType: 1, resourceId: 1 });
userActivitySchema.index({ ipAddress: 1, createdAt: -1 });
userActivitySchema.index({ createdAt: -1 });
userActivitySchema.index({ severity: 1, status: 1 });

// Virtual for formatted timestamp
userActivitySchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString();
});

// Static method to log activity
userActivitySchema.statics.logActivity = async function(activityData) {
  try {
    const activity = new this(activityData);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

// Static method to get user activity
userActivitySchema.statics.getUserActivity = function(userId, options = {}) {
  const {
    page = 1,
    limit = 50,
    action,
    resourceType,
    startDate,
    endDate,
    severity,
    status
  } = options;

  const query = { userId };
  
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (severity) query.severity = severity;
  if (status) query.status = status;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

// Static method to get activity statistics
userActivitySchema.statics.getActivityStats = function(options = {}) {
  const {
    userId,
    startDate,
    endDate,
    groupBy = 'action'
  } = options;

  const match = {};
  
  if (userId) match.userId = userId;
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: `$${groupBy}`,
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get suspicious activity
userActivitySchema.statics.getSuspiciousActivity = function(options = {}) {
  const {
    startDate,
    endDate,
    threshold = 10 // Number of failed attempts to consider suspicious
  } = options;

  const match = {
    status: 'failure',
    action: { $in: ['login', 'api_call', 'system_access'] }
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          userId: '$userId',
          ipAddress: '$ipAddress',
          action: '$action'
        },
        failureCount: { $sum: 1 },
        lastAttempt: { $max: '$createdAt' },
        errorMessages: { $addToSet: '$errorMessage' }
      }
    },
    {
      $match: {
        failureCount: { $gte: threshold }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $sort: { failureCount: -1 }
    }
  ]);
};

// Static method to get activity trends
userActivitySchema.statics.getActivityTrends = function(options = {}) {
  const {
    startDate,
    endDate,
    groupBy = 'day', // 'hour', 'day', 'week', 'month'
    action
  } = options;

  const match = {};
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  if (action) match.action = action;

  let dateFormat;
  switch (groupBy) {
    case 'hour':
      dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00:00', date: '$createdAt' } };
      break;
    case 'day':
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      break;
    case 'week':
      dateFormat = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
      break;
    case 'month':
      dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      break;
    default:
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          date: dateFormat,
          action: '$action'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        totalActivities: { $sum: '$count' },
        uniqueUsers: { $sum: { $size: '$uniqueUsers' } },
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Method to get activity summary for a user
userActivitySchema.methods.getSummary = function() {
  return {
    id: this._id,
    action: this.action,
    description: this.description,
    timestamp: this.createdAt,
    status: this.status,
    severity: this.severity,
    resource: this.resourceType ? {
      type: this.resourceType,
      id: this.resourceId
    } : null,
    location: this.location?.address || 'Unknown',
    device: this.deviceInfo?.type || 'Unknown'
  };
};

module.exports = mongoose.model('UserActivity', userActivitySchema);
