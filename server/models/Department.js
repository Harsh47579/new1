const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  address: {
    type: String,
    trim: true,
    maxlength: 200
  },
  headOfDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  workers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  categories: [{
    type: String,
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
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00'
    },
    end: {
      type: String,
      default: '17:00'
    }
  },
  responseTime: {
    type: Number,
    default: 24, // hours
    min: 1,
    max: 168 // 1 week
  },
  stats: {
    totalIssuesAssigned: {
      type: Number,
      default: 0
    },
    totalIssuesResolved: {
      type: Number,
      default: 0
    },
    averageResolutionTime: {
      type: Number,
      default: 0 // hours
    },
    currentActiveIssues: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
departmentSchema.index({ name: 1 });
departmentSchema.index({ email: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ categories: 1 });

// Virtual for worker count
departmentSchema.virtual('workerCount').get(function() {
  return this.workers.length;
});

// Method to add a worker
departmentSchema.methods.addWorker = function(workerId) {
  if (!this.workers.includes(workerId)) {
    this.workers.push(workerId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove a worker
departmentSchema.methods.removeWorker = function(workerId) {
  this.workers = this.workers.filter(id => !id.equals(workerId));
  return this.save();
};

// Method to check if department handles a category
departmentSchema.methods.handlesCategory = function(category) {
  return this.categories.includes(category) || this.categories.length === 0;
};

// Static method to find departments by category
departmentSchema.statics.findByCategory = function(category) {
  return this.find({
    isActive: true,
    $or: [
      { categories: category },
      { categories: { $size: 0 } } // Departments with no specific categories handle all
    ]
  });
};

// Static method to get department statistics
departmentSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalDepartments: { $sum: 1 },
        activeDepartments: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalWorkers: { $sum: { $size: '$workers' } },
        totalIssuesAssigned: { $sum: '$stats.totalIssuesAssigned' },
        totalIssuesResolved: { $sum: '$stats.totalIssuesResolved' }
      }
    }
  ]);
};

// Pre-save middleware to update stats
departmentSchema.pre('save', function(next) {
  if (this.isModified('workers')) {
    // Update worker count in stats if needed
    this.stats.currentActiveIssues = this.workers.length;
  }
  next();
});

module.exports = mongoose.model('Department', departmentSchema);