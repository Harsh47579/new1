const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Announcement = require('../models/Announcement');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for announcement attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/announcements';
    try {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (error) {
      console.error('Error creating uploads directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, documents, and videos are allowed'));
    }
  }
});

// @route   POST /api/announcements
// @desc    Create a new announcement (Admin only)
// @access  Private (Admin)
router.post('/', auth, upload.array('attachments', 5), [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('content').trim().isLength({ min: 10, max: 2000 }).withMessage('Content must be 10-2000 characters'),
  body('audience').isIn(['all', 'citizens', 'workers', 'admins']).withMessage('Invalid audience type'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date'),
  body('tags').optional().isString().withMessage('Tags must be a string')
], async (req, res) => {
  try {
    console.log('Announcement creation request received');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('User:', req.user);

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body fields:', Object.keys(req.body));
      console.log('Request body values:', req.body);
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

    const { title, content, audience, priority = 'medium', expiresAt, tags } = req.body;

    // Validate required fields
    if (!title || !content || !audience) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: [
          { field: 'title', message: 'Title is required' },
          { field: 'content', message: 'Content is required' },
          { field: 'audience', message: 'Audience is required' }
        ].filter(error => !req.body[error.field])
      });
    }

    // Process attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fileType = file.mimetype.startsWith('image/') ? 'image' :
                        file.mimetype.startsWith('video/') ? 'video' : 'document';
        
        attachments.push({
          type: fileType,
          url: `/uploads/announcements/${file.filename}`,
          filename: file.originalname,
          size: file.size
        });
      });
    }

    // Process tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const announcement = new Announcement({
      title,
      content,
      author: req.userId,
      audience,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      attachments,
      tags: tagArray
    });

    await announcement.save();
    await announcement.populate('author', 'name email');

    // Emit real-time notification to specific audience rooms
    const io = req.app.get('io');
    if (io) {
      const announcementData = {
        id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        audience: announcement.audience,
        priority: announcement.priority,
        author: announcement.author,
        createdAt: announcement.createdAt,
        expiresAt: announcement.expiresAt,
        tags: announcement.tags
      };

      // Emit to specific audience rooms
      if (audience === 'all') {
        io.emit('new_announcement', announcementData);
      } else {
        io.to(`audience-${audience}`).emit('new_announcement', announcementData);
      }

      // Also emit to admin room for monitoring
      io.to('admin-room').emit('admin_announcement_created', announcementData);
    }

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });

  } catch (error) {
    console.error('Create announcement error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/announcements
// @desc    Get announcements for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, priority, audience } = req.query;

    let query = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    // Filter by audience based on user role
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      query.audience = { $in: ['all', 'admins'] };
    } else {
      query.audience = { $in: ['all', 'citizens'] };
    }

    // Additional filters
    if (priority) {
      query.priority = priority;
    }

    if (audience && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
      query.audience = audience;
    }

    const announcements = await Announcement.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Announcement.countDocuments(query);

    // Mark announcements as read by current user
    const announcementIds = announcements.map(ann => ann._id);
    await Announcement.updateMany(
      { _id: { $in: announcementIds } },
      { $pull: { readBy: { user: req.userId } } }
    );
    await Announcement.updateMany(
      { _id: { $in: announcementIds } },
      { $push: { readBy: { user: req.userId } } }
    );

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalAnnouncements: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching announcements'
    });
  }
});

// @route   PUT /api/announcements/:id/read
// @desc    Mark announcement as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await announcement.markAsRead(req.userId);

    res.json({
      success: true,
      message: 'Announcement marked as read'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking announcement as read'
    });
  }
});

// @route   GET /api/announcements/unread-count
// @desc    Get count of unread announcements
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    let query = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ],
      'readBy.user': { $ne: req.userId }
    };

    // Filter by audience based on user role
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      query.audience = { $in: ['all', 'admins'] };
    } else {
      query.audience = { $in: ['all', 'citizens'] };
    }

    const unreadCount = await Announcement.countDocuments(query);

    res.json({
      success: true,
      data: {
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count'
    });
  }
});

// @route   PUT /api/announcements/:id
// @desc    Update announcement (Admin only)
// @access  Private (Admin)
router.put('/:id', auth, upload.array('attachments', 5), [
  body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('content').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Content must be 10-2000 characters'),
  body('audience').optional().isIn(['all', 'citizens', 'workers', 'admins']).withMessage('Invalid audience type'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const updateData = { ...req.body };

    // Process new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => {
        const fileType = file.mimetype.startsWith('image/') ? 'image' :
                        file.mimetype.startsWith('video/') ? 'video' : 'document';
        
        return {
          type: fileType,
          url: `/uploads/announcements/${file.filename}`,
          filename: file.originalname,
          size: file.size
        };
      });

      updateData.attachments = [...announcement.attachments, ...newAttachments];
    }

    // Process tags
    if (req.body.tags) {
      updateData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });

  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating announcement'
    });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting announcement'
    });
  }
});

module.exports = router;
