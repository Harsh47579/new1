const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Department = require('../models/Department');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
router.get('/', adminAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['citizen', 'worker', 'department', 'admin', 'super_admin']),
  query('status').optional().isIn(['active', 'suspended', 'banned', 'pending_verification']),
  query('search').optional().isString(),
  query('department').optional().isMongoId(),
  query('sortBy').optional().isIn(['name', 'email', 'createdAt', 'lastLogin', 'role']),
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
      role,
      status,
      search,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    // Apply filters
    if (role) filter.role = role;
    if (status) filter.accountStatus = status;
    if (department) filter.department = department;

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(filter)
      .populate('department', 'name email')
      .populate('suspensionHistory.suspendedBy', 'name email')
      .populate('suspensionHistory.liftedBy', 'name email')
      .populate('warnings.issuedBy', 'name email')
      .populate('flags.flaggedBy', 'name email')
      .populate('flags.reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    // Get statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$accountStatus', 'active'] }, 1, 0] }
          },
          suspendedUsers: {
            $sum: { $cond: [{ $eq: ['$accountStatus', 'suspended'] }, 1, 0] }
          },
          bannedUsers: {
            $sum: { $cond: [{ $eq: ['$accountStatus', 'banned'] }, 1, 0] }
          },
          citizens: {
            $sum: { $cond: [{ $eq: ['$role', 'citizen'] }, 1, 0] }
          },
          workers: {
            $sum: { $cond: [{ $eq: ['$role', 'worker'] }, 1, 0] }
          },
          admins: {
            $sum: { $cond: [{ $in: ['$role', ['admin', 'super_admin']] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        bannedUsers: 0,
        citizens: 0,
        workers: 0,
        admins: 0
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID with full details
// @access  Private (Admin only)
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('department', 'name email description')
      .populate('suspensionHistory.suspendedBy', 'name email')
      .populate('suspensionHistory.liftedBy', 'name email')
      .populate('warnings.issuedBy', 'name email')
      .populate('flags.flaggedBy', 'name email')
      .populate('flags.reviewedBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's issues
    const userIssues = await Issue.find({ reportedBy: user._id })
      .select('title status category priority createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get assigned issues (for workers/departments)
    const assignedIssues = await Issue.find({ 'assignedTo.worker': user._id })
      .select('title status category priority createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        issues: userIssues,
        assignedIssues: assignedIssues
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/', adminAuth, [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['citizen', 'worker', 'department', 'admin', 'super_admin']).withMessage('Invalid role'),
  body('department').optional().isMongoId().withMessage('Invalid department ID'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      phone,
      password,
      role,
      department,
      permissions = [],
      location = {},
      profile = {}
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'User with this email already exists'
          : 'User with this phone number already exists'
      });
    }

    // Validate department if provided
    if (department) {
      const dept = await Department.findById(department);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'Department not found'
        });
      }
    }

    // Set default permissions based on role
    const defaultPermissions = {
      'citizen': ['report_issues', 'view_own_issues'],
      'worker': ['view_assigned_issues', 'update_issue_status'],
      'department': ['issue_management', 'view_assigned_issues', 'update_issue_status', 'assign_issues'],
      'admin': ['user_management', 'issue_management', 'department_management', 'analytics_access', 'moderation_tools', 'view_all_issues', 'assign_issues', 'manage_departments', 'delete_issues', 'ban_users', 'warn_users'],
      'super_admin': ['*']
    };

    const userPermissions = permissions.length > 0 ? permissions : defaultPermissions[role] || [];

    const user = new User({
      name,
      email,
      phone,
      password,
      role,
      department,
      permissions: userPermissions,
      location: {
        type: 'Point',
        coordinates: location.coordinates || [85.3316, 23.3441], // Default to Ranchi
        address: location.address || '',
        city: location.city || 'Ranchi',
        state: location.state || 'Jharkhand'
      },
      profile: {
        bio: profile.bio || '',
        occupation: profile.occupation || '',
        organization: profile.organization || ''
      },
      verification: {
        emailVerified: true, // Admin-created users are pre-verified
        phoneVerified: true
      }
    });

    await user.save();

    // Add user to department if specified
    if (department && ['worker', 'department'].includes(role)) {
      await Department.findByIdAndUpdate(department, {
        $addToSet: { workers: user._id }
      });
    }

    // Populate the user data
    await user.populate('department', 'name email');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', adminAuth, [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit phone number'),
  body('role').optional().isIn(['citizen', 'worker', 'department', 'admin', 'super_admin']).withMessage('Invalid role'),
  body('department').optional().isMongoId().withMessage('Invalid department ID'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('accountStatus').optional().isIn(['active', 'suspended', 'banned', 'pending_verification']).withMessage('Invalid account status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = { ...req.body };

    // Check for duplicate email/phone if being updated
    if (updateData.email || updateData.phone) {
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(updateData.email ? [{ email: updateData.email }] : []),
          ...(updateData.phone ? [{ phone: updateData.phone }] : [])
        ]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === updateData.email 
            ? 'User with this email already exists'
            : 'User with this phone number already exists'
        });
      }
    }

    // Validate department if being updated
    if (updateData.department) {
      const dept = await Department.findById(updateData.department);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'Department not found'
        });
      }
    }

    // Handle department changes
    if (updateData.department !== user.department) {
      // Remove from old department
      if (user.department) {
        await Department.findByIdAndUpdate(user.department, {
          $pull: { workers: user._id }
        });
      }
      
      // Add to new department
      if (updateData.department) {
        await Department.findByIdAndUpdate(updateData.department, {
          $addToSet: { workers: user._id }
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('department', 'name email');

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has active issues
    const activeIssues = await Issue.countDocuments({
      reportedBy: user._id,
      status: { $in: ['new', 'in_progress'] }
    });

    if (activeIssues > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user. They have ${activeIssues} active issues.`
      });
    }

    // Soft delete by deactivating
    user.isActive = false;
    user.accountStatus = 'banned';
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// @route   POST /api/admin/users/:id/suspend
// @desc    Suspend user
// @access  Private (Admin only)
router.post('/:id/suspend', adminAuth, [
  body('reason').trim().isLength({ min: 5, max: 200 }).withMessage('Reason must be 5-200 characters'),
  body('duration').optional().isInt({ min: 1, max: 365 }).withMessage('Duration must be 1-365 days')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason, duration } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const durationMs = duration ? duration * 24 * 60 * 60 * 1000 : null; // Convert days to milliseconds
    await user.suspend(reason, durationMs, req.userId);

    // Create notification
    const notification = new Notification({
      userId: user._id,
      type: 'account_suspended',
      title: 'Account Suspended',
      message: `Your account has been suspended. Reason: ${reason}`,
      data: {
        reason,
        duration: duration ? `${duration} days` : 'Indefinite'
      }
    });
    await notification.save();

    res.json({
      success: true,
      message: 'User suspended successfully'
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending user'
    });
  }
});

// @route   POST /api/admin/users/:id/ban
// @desc    Ban user
// @access  Private (Admin only)
router.post('/:id/ban', adminAuth, [
  body('reason').trim().isLength({ min: 5, max: 200 }).withMessage('Reason must be 5-200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.ban(reason, req.userId);

    // Create notification
    const notification = new Notification({
      userId: user._id,
      type: 'account_banned',
      title: 'Account Banned',
      message: `Your account has been banned. Reason: ${reason}`,
      data: { reason }
    });
    await notification.save();

    res.json({
      success: true,
      message: 'User banned successfully'
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error banning user'
    });
  }
});

// @route   POST /api/admin/users/:id/lift-suspension
// @desc    Lift suspension/ban
// @access  Private (Admin only)
router.post('/:id/lift-suspension', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.liftSuspension(req.userId);

    // Create notification
    const notification = new Notification({
      userId: user._id,
      type: 'account_restored',
      title: 'Account Restored',
      message: 'Your account suspension has been lifted. You can now access the platform again.',
      data: {}
    });
    await notification.save();

    res.json({
      success: true,
      message: 'User suspension lifted successfully'
    });
  } catch (error) {
    console.error('Lift suspension error:', error);
    res.status(500).json({
      success: false,
      message: 'Error lifting suspension'
    });
  }
});

// @route   POST /api/admin/users/:id/warn
// @desc    Issue warning to user
// @access  Private (Admin only)
router.post('/:id/warn', adminAuth, [
  body('reason').trim().isLength({ min: 5, max: 100 }).withMessage('Reason must be 5-100 characters'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason, description } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.addWarning(reason, description, req.userId);

    // Create notification
    const notification = new Notification({
      userId: user._id,
      type: 'warning_issued',
      title: 'Warning Issued',
      message: `You have received a warning: ${reason}`,
      data: { reason, description }
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Warning issued successfully'
    });
  } catch (error) {
    console.error('Warn user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error issuing warning'
    });
  }
});

// @route   POST /api/admin/users/:id/flag
// @desc    Flag user for review
// @access  Private (Admin only)
router.post('/:id/flag', adminAuth, [
  body('type').isIn(['spam', 'inappropriate_content', 'false_report', 'harassment', 'other']).withMessage('Invalid flag type'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, description } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.addFlag(type, description, req.userId);

    res.json({
      success: true,
      message: 'User flagged successfully'
    });
  } catch (error) {
    console.error('Flag user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error flagging user'
    });
  }
});

// @route   GET /api/admin/users/:id/activity
// @desc    Get user activity log
// @access  Private (Admin only)
router.get('/:id/activity', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's issues
    const issues = await Issue.find({ reportedBy: user._id })
      .select('title status category priority createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Get assigned issues
    const assignedIssues = await Issue.find({ 'assignedTo.worker': user._id })
      .select('title status category priority createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Get user's comments (if you have a comments system)
    const comments = await Issue.find({
      'community.comments.user': user._id
    }).select('title community.comments createdAt');

    const activity = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      issues: issues,
      assignedIssues: assignedIssues,
      comments: comments,
      warnings: user.warnings,
      flags: user.flags,
      suspensionHistory: user.suspensionHistory
    };

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity'
    });
  }
});

module.exports = router;
