const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['citizen', 'worker', 'department', 'admin', 'super_admin'],
    default: 'citizen'
  },
  permissions: [{
    type: String,
    enum: [
      'user_management',
      'issue_management', 
      'department_management',
      'analytics_access',
      'system_settings',
      'moderation_tools',
      'report_issues',
      'view_own_issues',
      'view_assigned_issues',
      'update_issue_status',
      'assign_issues',
      'manage_departments',
      'view_all_issues',
      'delete_issues',
      'ban_users',
      'warn_users'
    ]
  }],
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() { return ['worker', 'department'].includes(this.role); }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: String,
    city: {
      type: String,
      default: 'Ranchi'
    },
    state: {
      type: String,
      default: 'Jharkhand'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'pending_verification'],
    default: 'active'
  },
  suspensionReason: {
    type: String,
    trim: true
  },
  suspensionExpiresAt: {
    type: Date
  },
  suspensionHistory: [{
    reason: String,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    suspendedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    liftedAt: Date,
    liftedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  warnings: [{
    reason: String,
    description: String,
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: Date
  }],
  flags: [{
    type: {
      type: String,
      enum: ['spam', 'inappropriate_content', 'false_report', 'harassment', 'other'],
      required: true
    },
    description: String,
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'action_taken'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    actionTaken: String
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'bn']
    }
  },
  stats: {
    reportsSubmitted: { type: Number, default: 0 },
    reportsResolved: { type: Number, default: 0 },
    communityScore: { type: Number, default: 0 }
  },
  rewards: {
    coins: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{
      name: String,
      description: String,
      earnedAt: { type: Date, default: Date.now },
      icon: String
    }],
    achievements: [{
      type: String, // 'first_report', 'resolved_issue', 'streak', 'community_hero'
      title: String,
      description: String,
      earnedAt: { type: Date, default: Date.now },
      points: Number
    }]
  },
  activity: {
    lastReportDate: Date,
    reportStreak: { type: Number, default: 0 },
    totalReportsThisMonth: { type: Number, default: 0 },
    totalReportsThisYear: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 0 },
    lastIpAddress: String,
    userAgent: String
  },
  profile: {
    avatar: String,
    bio: {
      type: String,
      maxlength: 500
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    occupation: String,
    organization: String
  },
  verification: {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    phoneVerificationToken: String,
    verifiedAt: Date
  }
}, {
  timestamps: true
});

// Create geospatial index
userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.phoneVerificationToken;
  return user;
};

// Check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  // Super admin has all permissions
  if (this.role === 'super_admin') return true;
  
  // Check if user has the specific permission
  return this.permissions.includes(permission);
};

// Check if user can access specific resource
userSchema.methods.canAccess = function(resource, action = 'read') {
  const rolePermissions = {
    'super_admin': ['*'], // All permissions
    'admin': [
      'user_management', 'issue_management', 'department_management', 
      'analytics_access', 'moderation_tools', 'view_all_issues', 
      'assign_issues', 'manage_departments', 'delete_issues', 
      'ban_users', 'warn_users'
    ],
    'department': [
      'issue_management', 'view_assigned_issues', 'update_issue_status', 
      'assign_issues', 'moderation_tools'
    ],
    'worker': [
      'view_assigned_issues', 'update_issue_status'
    ],
    'citizen': [
      'report_issues', 'view_own_issues'
    ]
  };

  const userPermissions = rolePermissions[this.role] || [];
  
  // Check if user has wildcard permission or specific permission
  return userPermissions.includes('*') || userPermissions.includes(resource);
};

// Check if user is banned or suspended
userSchema.methods.isAccountActive = function() {
  return this.accountStatus === 'active' && this.isActive;
};

// Check if user is suspended
userSchema.methods.isSuspended = function() {
  if (this.accountStatus === 'suspended') {
    // Check if suspension has expired
    if (this.suspensionExpiresAt && new Date() > this.suspensionExpiresAt) {
      this.accountStatus = 'active';
      this.suspensionReason = undefined;
      this.suspensionExpiresAt = undefined;
      return false;
    }
    return true;
  }
  return false;
};

// Add warning to user
userSchema.methods.addWarning = function(reason, description, issuedBy) {
  this.warnings.push({
    reason,
    description,
    issuedBy,
    issuedAt: new Date()
  });
  return this.save();
};

// Add flag to user
userSchema.methods.addFlag = function(type, description, flaggedBy) {
  this.flags.push({
    type,
    description,
    flaggedBy,
    flaggedAt: new Date()
  });
  return this.save();
};

// Suspend user
userSchema.methods.suspend = function(reason, duration, suspendedBy) {
  this.accountStatus = 'suspended';
  this.suspensionReason = reason;
  this.suspensionExpiresAt = duration ? new Date(Date.now() + duration) : undefined;
  
  this.suspensionHistory.push({
    reason,
    suspendedBy,
    suspendedAt: new Date(),
    expiresAt: this.suspensionExpiresAt
  });
  
  return this.save();
};

// Ban user
userSchema.methods.ban = function(reason, bannedBy) {
  this.accountStatus = 'banned';
  this.isActive = false;
  
  this.suspensionHistory.push({
    reason,
    suspendedBy: bannedBy,
    suspendedAt: new Date()
  });
  
  return this.save();
};

// Lift suspension/ban
userSchema.methods.liftSuspension = function(liftedBy) {
  const lastSuspension = this.suspensionHistory[this.suspensionHistory.length - 1];
  if (lastSuspension && !lastSuspension.liftedAt) {
    lastSuspension.liftedAt = new Date();
    lastSuspension.liftedBy = liftedBy;
  }
  
  this.accountStatus = 'active';
  this.suspensionReason = undefined;
  this.suspensionExpiresAt = undefined;
  this.isActive = true;
  
  return this.save();
};

// Update last activity
userSchema.methods.updateActivity = function(ipAddress, userAgent) {
  this.activity.lastActivityAt = new Date();
  this.activity.loginCount += 1;
  if (ipAddress) this.activity.lastIpAddress = ipAddress;
  if (userAgent) this.activity.userAgent = userAgent;
  return this.save();
};

// Get user's role-based permissions
userSchema.methods.getPermissions = function() {
  const rolePermissions = {
    'super_admin': ['*'],
    'admin': [
      'user_management', 'issue_management', 'department_management', 
      'analytics_access', 'moderation_tools', 'view_all_issues', 
      'assign_issues', 'manage_departments', 'delete_issues', 
      'ban_users', 'warn_users'
    ],
    'department': [
      'issue_management', 'view_assigned_issues', 'update_issue_status', 
      'assign_issues', 'moderation_tools'
    ],
    'worker': [
      'view_assigned_issues', 'update_issue_status'
    ],
    'citizen': [
      'report_issues', 'view_own_issues'
    ]
  };

  return rolePermissions[this.role] || [];
};

// Static method to get users by role
userSchema.statics.getByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to get banned users
userSchema.statics.getBannedUsers = function() {
  return this.find({ accountStatus: 'banned' });
};

// Static method to get suspended users
userSchema.statics.getSuspendedUsers = function() {
  return this.find({ accountStatus: 'suspended' });
};

// Static method to get users with flags
userSchema.statics.getFlaggedUsers = function() {
  return this.find({ 'flags.status': 'pending' });
};

module.exports = mongoose.model('User', userSchema);
