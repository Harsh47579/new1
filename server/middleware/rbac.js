const User = require('../models/User');

// RBAC middleware factory
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Get user from request (set by auth middleware)
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user account is active
      if (!user.isAccountActive()) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive'
        });
      }

      // Check if user is suspended
      if (user.isSuspended()) {
        return res.status(403).json({
          success: false,
          message: `Account is suspended. Reason: ${user.suspensionReason}`
        });
      }

      // Check if user has the required permission
      if (!user.hasPermission(permission)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Add user to request for use in route handlers
      req.user = user;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

// Role-based middleware
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isAccountActive()) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive'
        });
      }

      if (user.isSuspended()) {
        return res.status(403).json({
          success: false,
          message: `Account is suspended. Reason: ${user.suspensionReason}`
        });
      }

      if (!roleArray.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient role privileges'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking role'
      });
    }
  };
};

// Resource-based access control
const requireResourceAccess = (resource, action = 'read') => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isAccountActive()) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive'
        });
      }

      if (user.isSuspended()) {
        return res.status(403).json({
          success: false,
          message: `Account is suspended. Reason: ${user.suspensionReason}`
        });
      }

      // Check if user can access the resource
      if (!user.canAccess(resource, action)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Resource access middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking resource access'
      });
    }
  };
};

// Department-specific access control
const requireDepartmentAccess = () => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Super admin and admin can access all departments
      if (['super_admin', 'admin'].includes(user.role)) {
        req.user = user;
        return next();
      }

      // Department users can only access their own department
      if (['department', 'worker'].includes(user.role)) {
        if (!user.department) {
          return res.status(403).json({
            success: false,
            message: 'No department assigned'
          });
        }

        // Check if the requested resource belongs to their department
        const resourceId = req.params.id || req.params.departmentId;
        if (resourceId && resourceId !== user.department.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this department resource'
          });
        }
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Department access middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking department access'
      });
    }
  };
};

// Issue ownership/assignment check
const requireIssueAccess = () => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      const Issue = require('../models/Issue');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Super admin and admin can access all issues
      if (['super_admin', 'admin'].includes(user.role)) {
        req.user = user;
        return next();
      }

      const issueId = req.params.id || req.params.issueId;
      if (!issueId) {
        return next();
      }

      const issue = await Issue.findById(issueId);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Issue not found'
        });
      }

      // Citizens can only access their own issues
      if (user.role === 'citizen') {
        if (issue.reportedBy.toString() !== user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this issue'
          });
        }
      }

      // Department users can access issues assigned to their department
      if (['department', 'worker'].includes(user.role)) {
        if (issue.assignedTo?.department?.toString() !== user.department?.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this issue'
          });
        }
      }

      req.user = user;
      req.issue = issue;
      next();
    } catch (error) {
      console.error('Issue access middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking issue access'
      });
    }
  };
};

// Moderation permissions
const requireModerationAccess = () => {
  return requirePermission('moderation_tools');
};

// User management permissions
const requireUserManagement = () => {
  return requirePermission('user_management');
};

// Issue management permissions
const requireIssueManagement = () => {
  return requirePermission('issue_management');
};

// Department management permissions
const requireDepartmentManagement = () => {
  return requirePermission('department_management');
};

// Analytics access
const requireAnalyticsAccess = () => {
  return requirePermission('analytics_access');
};

module.exports = {
  requirePermission,
  requireRole,
  requireResourceAccess,
  requireDepartmentAccess,
  requireIssueAccess,
  requireModerationAccess,
  requireUserManagement,
  requireIssueManagement,
  requireDepartmentManagement,
  requireAnalyticsAccess
};
