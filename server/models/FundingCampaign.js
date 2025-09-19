const mongoose = require('mongoose');

const fundingCampaignSchema = new mongoose.Schema({
  issue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
    unique: true // One campaign per issue
  },
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  goal: {
    type: Number,
    required: true,
    min: [1000, 'Minimum goal is ₹1000'],
    max: [10000000, 'Maximum goal is ₹1,00,00,000']
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative']
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  contributors: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [10, 'Minimum contribution is ₹10']
    },
    contributedAt: {
      type: Date,
      default: Date.now
    },
    paymentIntentId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    }
  }],
  category: {
    type: String,
    required: true,
    enum: [
      'infrastructure',
      'environment',
      'education',
      'healthcare',
      'transport',
      'safety',
      'technology',
      'community',
      'other'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  deadline: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  images: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  stats: {
    totalContributors: {
      type: Number,
      default: 0
    },
    averageContribution: {
      type: Number,
      default: 0
    },
    lastContributionAt: Date
  },
  adminNotes: {
    type: String,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
fundingCampaignSchema.index({ issue: 1 });
fundingCampaignSchema.index({ isActive: 1, isCompleted: 1 });
fundingCampaignSchema.index({ category: 1 });
fundingCampaignSchema.index({ priority: 1 });
fundingCampaignSchema.index({ deadline: 1 });
fundingCampaignSchema.index({ 'contributors.user': 1 });
fundingCampaignSchema.index({ createdAt: -1 });

// Virtual for progress percentage
fundingCampaignSchema.virtual('progressPercentage').get(function() {
  return Math.min(Math.round((this.currentAmount / this.goal) * 100), 100);
});

// Virtual for days remaining
fundingCampaignSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for funding status
fundingCampaignSchema.virtual('fundingStatus').get(function() {
  if (this.isCompleted) return 'completed';
  if (this.currentAmount >= this.goal) return 'funded';
  if (this.daysRemaining <= 0) return 'expired';
  if (this.isActive) return 'active';
  return 'inactive';
});

// Method to add contribution
fundingCampaignSchema.methods.addContribution = function(userId, amount, paymentIntentId) {
  // Check if campaign is still active
  if (!this.isActive || this.isCompleted) {
    throw new Error('Campaign is not active or already completed');
  }

  // Check if deadline has passed
  if (this.daysRemaining <= 0) {
    throw new Error('Campaign deadline has passed');
  }

  // Add contribution
  this.contributors.push({
    user: userId,
    amount: amount,
    paymentIntentId: paymentIntentId,
    status: 'completed'
  });

  // Update current amount
  this.currentAmount += amount;

  // Update stats
  this.stats.totalContributors = this.contributors.length;
  this.stats.averageContribution = this.currentAmount / this.stats.totalContributors;
  this.stats.lastContributionAt = new Date();

  // Check if goal is reached
  if (this.currentAmount >= this.goal) {
    this.isCompleted = true;
  }

  return this.save();
};

// Method to get contribution summary
fundingCampaignSchema.methods.getContributionSummary = function() {
  const summary = {
    totalContributors: this.stats.totalContributors,
    totalAmount: this.currentAmount,
    averageContribution: this.stats.averageContribution,
    progressPercentage: this.progressPercentage,
    daysRemaining: this.daysRemaining,
    fundingStatus: this.fundingStatus
  };

  return summary;
};

// Static method to get active campaigns
fundingCampaignSchema.statics.getActiveCampaigns = function(filters = {}) {
  const query = {
    isActive: true,
    isCompleted: false,
    deadline: { $gt: new Date() }
  };

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.search) {
    query.$or = [
      { title: new RegExp(filters.search, 'i') },
      { description: new RegExp(filters.search, 'i') },
      { tags: { $in: [new RegExp(filters.search, 'i')] } }
    ];
  }

  return this.find(query)
    .populate('issue', 'title description location category priority')
    .populate('createdBy', 'name email')
    .sort(filters.sort || { createdAt: -1 });
};

// Pre-save middleware to update virtuals
fundingCampaignSchema.pre('save', function(next) {
  // Update stats
  this.stats.totalContributors = this.contributors.length;
  if (this.contributors.length > 0) {
    this.stats.averageContribution = this.currentAmount / this.contributors.length;
  }
  
  next();
});

module.exports = mongoose.model('FundingCampaign', fundingCampaignSchema);
