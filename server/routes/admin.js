const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const AdminActivity = require('../models/AdminActivity');
const { adminAuth, departmentAuth } = require('../middleware/auth');

const router = express.Router();

// Create a mock admin user for bypass
const createMockAdmin = () => ({
  _id: 'admin-bypass-id',
  name: 'Admin User',
  email: 'admin@jharkhand.gov.in',
  role: 'admin',
  isActive: true,
  permissions: ['*']
});

// Bypass middleware for direct admin access
const adminBypass = (req, res, next) => {
  req.user = createMockAdmin();
  req.userId = req.user._id;
  next();
};

// @route   GET /api/admin/direct
// @desc    Direct admin access without authentication
// @access  Public (Admin Bypass)
router.get('/direct', adminBypass, async (req, res) => {
  try {
    // Redirect to admin dashboard with bypass
    res.redirect('/api/admin/dashboard');
  } catch (error) {
    console.error('Direct admin access error:', error);
    res.status(500).json({ message: 'Error accessing admin panel' });
  }
});

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data with comprehensive error handling
// @access  Private (Admin) or Direct Access
router.get('/dashboard', adminBypass, async (req, res) => {
  console.log('🚀 Admin Dashboard API called at:', new Date().toISOString());
  
  try {
    // Step 1: Get basic counts (most reliable)
    console.log('📊 Step 1: Fetching basic counts...');
    const basicCounts = await Promise.allSettled([
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'new' }),
      Issue.countDocuments({ status: 'in_progress' }),
      Issue.countDocuments({ status: 'resolved' }),
      Issue.countDocuments({ status: 'rejected' }),
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true })
    ]);

    // Extract successful results
    const [
      totalIssues,
      newIssues,
      inProgressIssues,
      resolvedIssues,
      rejectedIssues,
      totalUsers,
      activeUsers,
      departments
    ] = basicCounts.map(result => 
      result.status === 'fulfilled' ? result.value : 0
    );

    console.log('✅ Basic counts fetched:', {
      totalIssues,
      newIssues,
      inProgressIssues,
      resolvedIssues,
      rejectedIssues,
      totalUsers,
      activeUsers,
      departments
    });

    // Step 2: Get recent issues (simplified, no complex population)
    console.log('📋 Step 2: Fetching recent issues...');
    let recentIssues = [];
    try {
      recentIssues = await Issue.find()
        .select('title status priority createdAt reporter')
        .populate('reporter', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      console.log('✅ Recent issues fetched:', recentIssues.length);
    } catch (error) {
      console.error('⚠️ Error fetching recent issues:', error.message);
      recentIssues = [];
    }

    // Step 3: Get chart data (simplified aggregations)
    console.log('📈 Step 3: Fetching chart data...');
    let issuesByStatus = [];
    let issuesByCategory = [];
    let issuesByPriority = [];

    try {
      [issuesByStatus, issuesByCategory, issuesByPriority] = await Promise.allSettled([
        Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Issue.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]),
        Issue.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }])
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));
      
      console.log('✅ Chart data fetched');
    } catch (error) {
      console.error('⚠️ Error fetching chart data:', error.message);
    }

    // Step 4: Get recent activity (optional)
    console.log('📝 Step 4: Fetching recent activity...');
    let recentActivity = [];
    try {
      recentActivity = await AdminActivity.find()
        .select('action createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      console.log('✅ Recent activity fetched:', recentActivity.length);
    } catch (error) {
      console.error('⚠️ Error fetching recent activity:', error.message);
      recentActivity = [];
    }

    // Step 5: Build response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      overview: {
        totalIssues,
        newIssues,
        inProgressIssues,
        resolvedIssues,
        rejectedIssues,
        totalUsers,
        activeUsers,
        departments
      },
      charts: {
        issuesByStatus,
        issuesByCategory,
        issuesByPriority
      },
      metrics: {
        avgResponseTime: 0,
        avgResolutionTime: 0
      },
      recentIssues,
      recentActivity
    };

    console.log('✅ Admin dashboard response built successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Return a safe fallback response
    res.status(500).json({
      success: false,
      error: 'Server error while fetching dashboard data',
      message: error.message,
      timestamp: new Date().toISOString(),
      fallback: {
        overview: {
          totalIssues: 0,
          newIssues: 0,
          inProgressIssues: 0,
          resolvedIssues: 0,
          rejectedIssues: 0,
          totalUsers: 0,
          activeUsers: 0,
          departments: 0
        },
        charts: {
          issuesByStatus: [],
          issuesByCategory: [],
          issuesByPriority: []
        },
        metrics: {
          avgResponseTime: 0,
          avgResolutionTime: 0
        },
        recentIssues: [],
        recentActivity: []
      }
    });
  }
});

// @route   GET /api/admin/issues
// @desc    Get all issues with advanced filtering
// @access  Private (Admin)
router.get('/issues', adminAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['new', 'in_progress', 'resolved', 'closed', 'rejected']),
  query('category').optional().isString(),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('department').optional().isString(),
  query('assignedTo').optional().isMongoId(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'priority', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      department,
      assignedTo,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = new RegExp(category, 'i');
    if (priority) filter.priority = priority;
    if (assignedTo) filter['assignedTo.worker'] = assignedTo;
    if (department) {
      if (department === 'unassigned') {
        filter.$or = [
          { 'assignedTo.department': { $exists: false } },
          { 'assignedTo.department': null }
        ];
      } else {
        filter['assignedTo.department'] = department;
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.address': new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const issues = await Issue.find(filter)
      .select('title description status priority category createdAt updatedAt reporter assignedTo location')
      .populate('reporter', 'name email')
      .populate('assignedTo.worker', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Handle department population separately to avoid ObjectId casting errors
    for (let issue of issues) {
      if (issue.assignedTo && issue.assignedTo.department) {
        // Check if department is already a string (legacy data) or ObjectId
        if (typeof issue.assignedTo.department === 'string') {
          // If it's a string, keep it as is (legacy department names)
          issue.assignedTo.departmentName = issue.assignedTo.department;
        } else {
          // If it's an ObjectId, populate it
          try {
            const department = await Department.findById(issue.assignedTo.department).select('name');
            issue.assignedTo.departmentName = department ? department.name : 'Unknown Department';
          } catch (error) {
            console.warn('Failed to populate department:', error.message);
            issue.assignedTo.departmentName = 'Unknown Department';
          }
        }
      }
    }

    const total = await Issue.countDocuments(filter);

    // Get filter options for UI
    const filterOptions = {
      categories: await Issue.distinct('category'),
      priorities: await Issue.distinct('priority'),
      statuses: await Issue.distinct('status'),
      departments: await Issue.distinct('assignedTo.department')
    };

    res.json({
      issues,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      filterOptions
    });
  } catch (error) {
    console.error('❌ Get admin issues error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error name:', error.name);
    
    res.status(500).json({ 
      message: 'Server error while fetching issues',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   PUT /api/admin/issues/:id/assign
// @desc    Assign issue to department and officer
// @access  Private (Admin)
router.put('/issues/:id/assign', adminAuth, [
  body('department').notEmpty().withMessage('Department is required'),
  body('worker').optional().isMongoId().withMessage('Invalid worker ID'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('estimatedResolution').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { department, worker, priority, estimatedResolution, notes } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Handle department assignment - can be either ObjectId or department name
    let departmentId = department;
    let departmentName = department;
    
    // If department is a string (department name), find the ObjectId
    if (typeof department === 'string') {
      const departmentDoc = await Department.findOne({ name: department });
      if (!departmentDoc) {
        return res.status(400).json({ message: `Department '${department}' not found` });
      }
      departmentId = departmentDoc._id;
      departmentName = departmentDoc.name;
    }

    // Update assignment
    issue.assignedTo = {
      department: departmentId,
      worker: worker || null,
      assignedAt: new Date()
    };

    if (priority) issue.priority = priority;
    if (estimatedResolution) issue.estimatedResolution = new Date(estimatedResolution);

    // Add to timeline
    issue.timeline.push({
      status: issue.status,
      description: `Issue assigned to ${departmentName}${worker ? ` and worker` : ''}`,
      updatedBy: req.userId
    });

    // Add private notes if provided
    if (notes) {
      issue.privateNotes = issue.privateNotes || [];
      issue.privateNotes.push({
        note: notes,
        addedBy: req.userId,
        addedAt: new Date()
      });
    }

    await issue.save();

    // Log activity
    await AdminActivity.logActivity(req.userId, 'issue_assigned', {
      type: 'issue',
      id: issue._id
    }, {
      department,
      worker,
      priority,
      estimatedResolution
    });

    // Create notification for reporter
    await Notification.createNotification(
      issue.reporter,
      'issue_acknowledged',
      'Issue Assigned',
      `Your issue "${issue.title}" has been assigned to ${departmentName}`,
      { issueId: issue._id }
    );

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('issue-assigned', {
      issueId: issue._id,
      department: departmentName,
      departmentId,
      worker,
      assignedBy: req.user.name
    });

    res.json({ message: 'Issue assigned successfully', issue });
  } catch (error) {
    console.error('Assign issue error:', error);
    res.status(500).json({ 
      message: 'Server error while assigning issue',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   PUT /api/admin/issues/:id/status
// @desc    Update issue status with detailed tracking
// @access  Private (Admin)
router.put('/issues/:id/status', adminAuth, [
  body('status').isIn(['new', 'in_progress', 'resolved', 'closed', 'rejected']).withMessage('Invalid status'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('resolution').optional().isObject().withMessage('Resolution must be an object'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, description, resolution, notes } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const oldStatus = issue.status;
    issue.updateStatus(status, description, req.userId);

    // Update resolution details if provided
    if (resolution) {
      issue.resolution = {
        ...issue.resolution,
        ...resolution,
        resolvedAt: status === 'resolved' ? new Date() : issue.resolution.resolvedAt,
        resolvedBy: status === 'resolved' ? req.userId : issue.resolution.resolvedBy
      };
    }

    // Add private notes if provided
    if (notes) {
      issue.privateNotes = issue.privateNotes || [];
      issue.privateNotes.push({
        note: notes,
        addedBy: req.userId,
        addedAt: new Date()
      });
    }

    await issue.save();

    // Log activity
    await AdminActivity.logActivity(req.userId, 'issue_status_updated', {
      type: 'issue',
      id: issue._id
    }, {
      oldStatus,
      newStatus: status,
      description,
      resolution
    });

    // Create notification for reporter
    const statusMessages = {
      'in_progress': 'Your issue is now being worked on',
      'resolved': 'Your issue has been resolved',
      'closed': 'Your issue has been closed',
      'rejected': 'Your issue has been rejected'
    };

    if (statusMessages[status]) {
      await Notification.createNotification(
        issue.reporter,
        'status_update',
        `Issue ${status.replace('_', ' ').toUpperCase()}`,
        statusMessages[status],
        { issueId: issue._id }
      );
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('issue-status-update', {
      issueId: issue._id,
      status: issue.status,
      updatedBy: req.user.name,
      updatedAt: new Date()
    });

    res.json({ message: 'Issue status updated successfully', issue });
  } catch (error) {
    console.error('Update issue status error:', error);
    res.status(500).json({ message: 'Server error while updating issue status' });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get analytics data
// @access  Private (Admin)
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { period = '30d', type = 'overview' } = req.query;

    // Calculate date range
    const now = new Date();
    const periods = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    
    const startDate = new Date(now - periods[period]);

    if (type === 'trends') {
      // Get trend analysis
      const trends = await Issue.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              category: '$category'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      res.json({ trends });
    } else if (type === 'heatmap') {
      // Get heatmap data
      const heatmapData = await Issue.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              lat: { $arrayElemAt: ['$location.coordinates', 1] },
              lng: { $arrayElemAt: ['$location.coordinates', 0] }
            },
            count: { $sum: 1 },
            categories: { $addToSet: '$category' }
          }
        },
        {
          $project: {
            coordinates: ['$_id.lng', '$_id.lat'],
            count: 1,
            categories: 1,
            _id: 0
          }
        }
      ]);

      res.json({ heatmapData });
    } else {
      // Overview analytics
      const [
        totalIssues,
        resolvedIssues,
        avgResponseTime,
        avgResolutionTime,
        topCategories,
        topLocations,
        departmentPerformance
      ] = await Promise.all([
        Issue.countDocuments({ createdAt: { $gte: startDate } }),
        Issue.countDocuments({ 
          status: 'resolved', 
          createdAt: { $gte: startDate } 
        }),
        Issue.aggregate([
          {
            $match: {
              status: { $in: ['resolved', 'closed'] },
              createdAt: { $gte: startDate }
            }
          },
          {
            $project: {
              responseTime: {
                $divide: [
                  {
                    $subtract: [
                      { $arrayElemAt: ['$timeline.updatedAt', 1] },
                      '$createdAt'
                    ]
                  },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avg: { $avg: '$responseTime' }
            }
          }
        ]),
        Issue.aggregate([
          {
            $match: {
              status: { $in: ['resolved', 'closed'] },
              createdAt: { $gte: startDate }
            }
          },
          {
            $project: {
              resolutionTime: {
                $divide: [
                  {
                    $subtract: [
                      { $arrayElemAt: ['$timeline.updatedAt', -1] },
                      '$createdAt'
                    ]
                  },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avg: { $avg: '$resolutionTime' }
            }
          }
        ]),
        Issue.aggregate([
          {
            $match: { createdAt: { $gte: startDate } }
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Issue.aggregate([
          {
            $match: { createdAt: { $gte: startDate } }
          },
          {
            $group: {
              _id: '$location.address',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Issue.aggregate([
          {
            $match: { 
              'assignedTo.department': { $exists: true },
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: '$assignedTo.department',
              total: { $sum: 1 },
              resolved: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
              }
            }
          },
          {
            $project: {
              department: '$_id',
              total: 1,
              resolved: 1,
              resolutionRate: {
                $multiply: [
                  { $divide: ['$resolved', '$total'] },
                  100
                ]
              }
            }
          },
          { $sort: { resolutionRate: -1 } }
        ])
      ]);

      res.json({
        overview: {
          totalIssues,
          resolvedIssues,
          resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0,
          avgResponseTime: avgResponseTime[0]?.avg || 0,
          avgResolutionTime: avgResolutionTime[0]?.avg || 0
        },
        topCategories,
        topLocations,
        departmentPerformance
      });
    }
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
});

// @route   GET /api/admin/departments
// @desc    Get all departments
// @access  Private (Admin)
router.get('/departments', adminAuth, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('staff.user', 'name email')
      .sort({ name: 1 });

    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error while fetching departments' });
  }
});

// @route   POST /api/admin/departments
// @desc    Create new department
// @access  Private (Admin)
router.post('/departments', adminAuth, [
  body('name').notEmpty().withMessage('Department name is required'),
  body('description').optional().isString(),
  body('categories').optional().isArray(),
  body('contact.email').optional().isEmail(),
  body('contact.phone').optional().isString(),
  body('contact.address').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const department = new Department(req.body);
    await department.save();

    // Log activity
    await AdminActivity.logActivity(req.userId, 'department_created', {
      type: 'department',
      id: department._id
    }, req.body);

    res.status(201).json({ message: 'Department created successfully', department });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error while creating department' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filtering
// @access  Private (Admin)
router.get('/users', adminAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['citizen', 'admin', 'department']),
  query('isActive').optional().isBoolean(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      search
    } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private (Admin)
router.put('/users/:id/role', adminAuth, [
  body('role').isIn(['citizen', 'admin', 'department']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Log activity
    await AdminActivity.logActivity(req.userId, 'user_updated', {
      type: 'user',
      id: user._id
    }, {
      oldRole,
      newRole: role,
      isActive
    });

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error while updating user role' });
  }
});

module.exports = router;
