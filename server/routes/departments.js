const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const Department = require('../models/Department');
const User = require('../models/User');
const Issue = require('../models/Issue');

// @route   POST /api/departments
// @desc    Create a new department
// @access  Private (Admin only)
router.post('/', adminAuth, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      return /^[0-9]{10}$/.test(value);
    }
    return true;
  }).withMessage('Phone must be exactly 10 digits'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address cannot exceed 200 characters'),
  body('headOfDepartment').optional().custom((value) => {
    if (value && value.trim() !== '') {
      return require('mongoose').Types.ObjectId.isValid(value);
    }
    return true;
  }).withMessage('Invalid head of department ID'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('workingHours.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('workingHours.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
  body('responseTime').optional().isInt({ min: 1, max: 168 }).withMessage('Response time must be 1-168 hours')
], async (req, res) => {
  try {
    console.log('Department creation request received');
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Detailed validation errors:');
      errors.array().forEach(error => {
        console.log(`- Field: ${error.path}, Message: ${error.msg}, Value: ${error.value}`);
      });
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    const {
      name,
      email,
      description,
      phone,
      address,
      headOfDepartment,
      categories,
      workingHours,
      responseTime
    } = req.body;

    console.log('Extracted fields:');
    console.log('name:', name);
    console.log('email:', email);
    console.log('description:', description);
    console.log('phone:', phone);
    console.log('address:', address);
    console.log('headOfDepartment:', headOfDepartment);
    console.log('categories:', categories);
    console.log('workingHours:', workingHours);
    console.log('responseTime:', responseTime);

    // Check if department already exists
    const existingDepartment = await Department.findOne({
      $or: [{ name }, { email }]
    });

    if (existingDepartment) {
      return res.status(400).json({
        message: existingDepartment.name === name 
          ? 'Department with this name already exists'
          : 'Department with this email already exists'
      });
    }

    // Validate head of department if provided
    if (headOfDepartment) {
      const headUser = await User.findById(headOfDepartment);
      if (!headUser) {
        return res.status(400).json({ message: 'Head of department not found' });
      }
    }

    const department = new Department({
      name,
      email,
      description,
      phone,
      address,
      headOfDepartment,
      categories: categories || [],
      workingHours: workingHours || { start: '09:00', end: '17:00' },
      responseTime: responseTime || 24
    });

    await department.save();

    // Populate the head of department
    await department.populate('headOfDepartment', 'name email');

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating department'
    });
  }
});

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      category = '', 
      isActive = 'true' 
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.categories = category;
    }

    // Active filter
    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    const departments = await Department.find(query)
      .populate('headOfDepartment', 'name email')
      .populate('workers', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Department.countDocuments(query);

    res.json({
      success: true,
      departments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching departments'
    });
  }
});

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('headOfDepartment', 'name email phone')
      .populate('workers', 'name email phone role');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      department
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department'
    });
  }
});

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin only)
router.put('/:id', adminAuth, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('description').optional().trim().isLength({ min: 10, max: 500 }).withMessage('Description must be 10-500 characters'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      return /^[0-9]{10}$/.test(value);
    }
    return true;
  }).withMessage('Phone must be exactly 10 digits'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Address cannot exceed 200 characters'),
  body('headOfDepartment').optional().custom((value) => {
    if (value && value.trim() !== '') {
      return require('mongoose').Types.ObjectId.isValid(value);
    }
    return true;
  }).withMessage('Invalid head of department ID'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const updateData = { ...req.body };

    // Check for duplicate name/email if being updated
    if (updateData.name || updateData.email) {
      const existingDepartment = await Department.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(updateData.name ? [{ name: updateData.name }] : []),
          ...(updateData.email ? [{ email: updateData.email }] : [])
        ]
      });

      if (existingDepartment) {
        return res.status(400).json({
          message: existingDepartment.name === updateData.name 
            ? 'Department with this name already exists'
            : 'Department with this email already exists'
        });
      }
    }

    // Validate head of department if being updated
    if (updateData.headOfDepartment) {
      const headUser = await User.findById(updateData.headOfDepartment);
      if (!headUser) {
        return res.status(400).json({ message: 'Head of department not found' });
      }
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('headOfDepartment', 'name email')
     .populate('workers', 'name email');

    res.json({
      success: true,
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating department'
    });
  }
});

// @route   DELETE /api/departments/:id
// @desc    Delete department
// @access  Private (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if department has assigned issues
    const assignedIssues = await Issue.countDocuments({
      'assignedTo.department': req.params.id,
      status: { $in: ['new', 'in_progress'] }
    });

    if (assignedIssues > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. It has ${assignedIssues} active assigned issues.`
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting department'
    });
  }
});

// @route   POST /api/departments/:id/workers
// @desc    Add worker to department
// @access  Private (Admin only)
router.post('/:id/workers', adminAuth, [
  body('workerId').isMongoId().withMessage('Valid worker ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { workerId } = req.body;
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    await department.addWorker(workerId);

    res.json({
      success: true,
      message: 'Worker added to department successfully'
    });
  } catch (error) {
    console.error('Add worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding worker to department'
    });
  }
});

// @route   DELETE /api/departments/:id/workers/:workerId
// @desc    Remove worker from department
// @access  Private (Admin only)
router.delete('/:id/workers/:workerId', adminAuth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    await department.removeWorker(req.params.workerId);

    res.json({
      success: true,
      message: 'Worker removed from department successfully'
    });
  } catch (error) {
    console.error('Remove worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing worker from department'
    });
  }
});

// @route   GET /api/departments/:id/workers
// @desc    Get department workers
// @access  Private
router.get('/:id/workers', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('workers', 'name email phone role');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      workers: department.workers
    });
  } catch (error) {
    console.error('Get department workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department workers'
    });
  }
});

// @route   GET /api/departments/stats/overview
// @desc    Get department statistics
// @access  Private (Admin only)
router.get('/stats/overview', adminAuth, async (req, res) => {
  try {
    const stats = await Department.getStatistics();
    const departmentStats = await Department.aggregate([
      {
        $lookup: {
          from: 'issues',
          localField: '_id',
          foreignField: 'assignedTo.department',
          as: 'assignedIssues'
        }
      },
      {
        $project: {
          name: 1,
          totalIssues: { $size: '$assignedIssues' },
          resolvedIssues: {
            $size: {
              $filter: {
                input: '$assignedIssues',
                cond: { $eq: ['$$this.status', 'resolved'] }
              }
            }
          },
          activeIssues: {
            $size: {
              $filter: {
                input: '$assignedIssues',
                cond: { $in: ['$$this.status', ['new', 'in_progress']] }
              }
            }
          },
          workerCount: { $size: '$workers' }
        }
      },
      {
        $sort: { totalIssues: -1 }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalDepartments: 0,
        activeDepartments: 0,
        totalWorkers: 0,
        totalIssuesAssigned: 0,
        totalIssuesResolved: 0
      },
      departmentStats
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department statistics'
    });
  }
});

module.exports = router;
