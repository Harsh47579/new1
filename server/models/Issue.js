const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Issue title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Issue category is required'],
    enum: [
      'Road & Pothole Issues',
      'Streetlight Problems',
      'Waste Management',
      'Water Supply',
      'Sewage & Drainage',
      'Public Safety',
      'Parks & Recreation',
      'Traffic Management',
      'Other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed', 'rejected'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // AI-generated fields
  aiAnalysis: {
    suggestedCategory: {
      type: String,
      trim: true
    },
    suggestedPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    reasoning: {
      type: String,
      trim: true
    },
    suggestedDepartment: {
      type: String,
      trim: true
    },
    analyzedAt: {
      type: Date,
      default: Date.now
    }
  },
  // Crowdfunding/Participatory Budgeting
  isFundable: {
    type: Boolean,
    default: false
  },
  funding: {
    goal: {
      type: Number,
      min: 0
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    contributors: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      amount: {
        type: Number,
        min: 0
      },
      contributedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Proof of Resolution
  proof: {
    beforePhotoURL: {
      type: String
    },
    afterPhotoURL: {
      type: String
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: {
      type: Date
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    }
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      default: 'Ranchi'
    },
    state: {
      type: String,
      default: 'Jharkhand'
    }
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedTo: {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  resolution: {
    description: String,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    beforeImages: [String],
    afterImages: [String]
  },
  timeline: [{
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'closed', 'rejected']
    },
    description: String,
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  community: {
    upvotes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      text: {
        type: String,
        required: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      isEdited: {
        type: Boolean,
        default: false
      }
    }],
    confirmations: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  estimatedResolution: Date,
  tags: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
issueSchema.index({ location: '2dsphere' });

// Create compound indexes for efficient querying
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ reporter: 1, createdAt: -1 });
issueSchema.index({ 'assignedTo.department': 1, status: 1 });

// Virtual for upvote count
issueSchema.virtual('upvoteCount').get(function() {
  return this.community.upvotes.length;
});

// Virtual for comment count
issueSchema.virtual('commentCount').get(function() {
  return this.community.comments.length;
});

// Virtual for confirmation count
issueSchema.virtual('confirmationCount').get(function() {
  return this.community.confirmations.length;
});

// Method to add upvote
issueSchema.methods.addUpvote = function(userId) {
  const existingUpvote = this.community.upvotes.find(
    upvote => upvote.user.toString() === userId.toString()
  );
  
  if (!existingUpvote) {
    this.community.upvotes.push({ user: userId });
    return true;
  }
  return false;
};

// Method to remove upvote
issueSchema.methods.removeUpvote = function(userId) {
  this.community.upvotes = this.community.upvotes.filter(
    upvote => upvote.user.toString() !== userId.toString()
  );
};

// Method to add comment
issueSchema.methods.addComment = function(userId, text) {
  this.community.comments.push({
    user: userId,
    text: text
  });
};

// Method to add confirmation
issueSchema.methods.addConfirmation = function(userId) {
  const existingConfirmation = this.community.confirmations.find(
    conf => conf.user.toString() === userId.toString()
  );
  
  if (!existingConfirmation) {
    this.community.confirmations.push({ user: userId });
    return true;
  }
  return false;
};

// Method to update status
issueSchema.methods.updateStatus = function(newStatus, description, updatedBy) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    description: description,
    updatedBy: updatedBy
  });
  
  if (newStatus === 'resolved') {
    this.resolution.resolvedAt = new Date();
    this.resolution.resolvedBy = updatedBy;
  }
};

// Add indexes for better performance
issueSchema.index({ status: 1 });
issueSchema.index({ category: 1 });
issueSchema.index({ priority: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ 'assignedTo.department': 1 });
issueSchema.index({ reporter: 1 });
issueSchema.index({ status: 1, category: 1 });
issueSchema.index({ status: 1, priority: 1 });

// Ensure virtual fields are serialized
issueSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Issue', issueSchema);
