const UserActivity = require('../models/UserActivity');
const User = require('../models/User');

class ActivityTracker {
  // Log user activity
  static async logActivity(userId, activityData) {
    try {
      const activity = {
        userId,
        ...activityData,
        timestamp: new Date()
      };

      return await UserActivity.logActivity(activity);
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  // Log login activity
  static async logLogin(userId, ipAddress, userAgent, location = null) {
    return await this.logActivity(userId, {
      action: 'login',
      description: 'User logged in',
      ipAddress,
      userAgent,
      location,
      resourceType: 'user',
      resourceId: userId,
      severity: 'low',
      status: 'success'
    });
  }

  // Log logout activity
  static async logLogout(userId, ipAddress, userAgent) {
    return await this.logActivity(userId, {
      action: 'logout',
      description: 'User logged out',
      ipAddress,
      userAgent,
      resourceType: 'user',
      resourceId: userId,
      severity: 'low',
      status: 'success'
    });
  }

  // Log issue report
  static async logIssueReport(userId, issueId, issueData) {
    return await this.logActivity(userId, {
      action: 'issue_report',
      description: `Reported issue: ${issueData.title}`,
      resourceType: 'issue',
      resourceId: issueId,
      severity: 'medium',
      status: 'success',
      details: {
        issueTitle: issueData.title,
        category: issueData.category,
        priority: issueData.priority
      }
    });
  }

  // Log issue update
  static async logIssueUpdate(userId, issueId, updateData) {
    return await this.logActivity(userId, {
      action: 'issue_update',
      description: `Updated issue: ${updateData.field} to ${updateData.value}`,
      resourceType: 'issue',
      resourceId: issueId,
      severity: 'medium',
      status: 'success',
      details: updateData
    });
  }

  // Log issue assignment
  static async logIssueAssignment(userId, issueId, assignmentData) {
    return await this.logActivity(userId, {
      action: 'issue_assign',
      description: `Assigned issue to ${assignmentData.departmentName}`,
      resourceType: 'issue',
      resourceId: issueId,
      severity: 'high',
      status: 'success',
      details: assignmentData
    });
  }

  // Log user creation
  static async logUserCreation(adminId, newUserId, userData) {
    return await this.logActivity(adminId, {
      action: 'user_create',
      description: `Created user: ${userData.name}`,
      resourceType: 'user',
      resourceId: newUserId,
      severity: 'high',
      status: 'success',
      details: {
        userName: userData.name,
        userEmail: userData.email,
        userRole: userData.role
      }
    });
  }

  // Log user suspension
  static async logUserSuspension(adminId, targetUserId, suspensionData) {
    return await this.logActivity(adminId, {
      action: 'user_suspend',
      description: `Suspended user: ${suspensionData.userName}`,
      resourceType: 'user',
      resourceId: targetUserId,
      severity: 'critical',
      status: 'success',
      details: suspensionData
    });
  }

  // Log user ban
  static async logUserBan(adminId, targetUserId, banData) {
    return await this.logActivity(adminId, {
      action: 'user_ban',
      description: `Banned user: ${banData.userName}`,
      resourceType: 'user',
      resourceId: targetUserId,
      severity: 'critical',
      status: 'success',
      details: banData
    });
  }

  // Log permission change
  static async logPermissionChange(adminId, targetUserId, permissionData) {
    return await this.logActivity(adminId, {
      action: 'permission_change',
      description: `Changed permissions for user: ${permissionData.userName}`,
      resourceType: 'user',
      resourceId: targetUserId,
      severity: 'high',
      status: 'success',
      details: permissionData
    });
  }

  // Log role change
  static async logRoleChange(adminId, targetUserId, roleData) {
    return await this.logActivity(adminId, {
      action: 'role_change',
      description: `Changed role for user: ${roleData.userName} to ${roleData.newRole}`,
      resourceType: 'user',
      resourceId: targetUserId,
      severity: 'high',
      status: 'success',
      details: roleData
    });
  }

  // Log department creation
  static async logDepartmentCreation(adminId, departmentId, departmentData) {
    return await this.logActivity(adminId, {
      action: 'department_create',
      description: `Created department: ${departmentData.name}`,
      resourceType: 'department',
      resourceId: departmentId,
      severity: 'high',
      status: 'success',
      details: departmentData
    });
  }

  // Log API call
  static async logApiCall(userId, endpoint, method, statusCode, ipAddress, userAgent) {
    return await this.logActivity(userId, {
      action: 'api_call',
      description: `${method} ${endpoint} - ${statusCode}`,
      ipAddress,
      userAgent,
      severity: statusCode >= 400 ? 'medium' : 'low',
      status: statusCode >= 400 ? 'failure' : 'success',
      details: {
        endpoint,
        method,
        statusCode
      }
    });
  }

  // Log failed login attempt
  static async logFailedLogin(email, ipAddress, userAgent, reason) {
    return await this.logActivity(null, {
      action: 'login',
      description: `Failed login attempt for ${email}`,
      ipAddress,
      userAgent,
      severity: 'medium',
      status: 'failure',
      errorMessage: reason,
      details: {
        email,
        reason
      }
    });
  }

  // Log system access
  static async logSystemAccess(userId, systemComponent, action, ipAddress, userAgent) {
    return await this.logActivity(userId, {
      action: 'system_access',
      description: `Accessed ${systemComponent} - ${action}`,
      ipAddress,
      userAgent,
      resourceType: 'system',
      severity: 'medium',
      status: 'success',
      details: {
        component: systemComponent,
        action
      }
    });
  }

  // Get user activity summary
  static async getUserActivitySummary(userId, options = {}) {
    try {
      const activities = await UserActivity.getUserActivity(userId, options);
      const stats = await UserActivity.getActivityStats({ userId, ...options });
      
      return {
        activities,
        stats,
        totalActivities: activities.length
      };
    } catch (error) {
      console.error('Error getting user activity summary:', error);
      throw error;
    }
  }

  // Get suspicious activities
  static async getSuspiciousActivities(options = {}) {
    try {
      return await UserActivity.getSuspiciousActivity(options);
    } catch (error) {
      console.error('Error getting suspicious activities:', error);
      throw error;
    }
  }

  // Get activity trends
  static async getActivityTrends(options = {}) {
    try {
      return await UserActivity.getActivityTrends(options);
    } catch (error) {
      console.error('Error getting activity trends:', error);
      throw error;
    }
  }

  // Get admin activity dashboard data
  static async getAdminDashboardData(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate = new Date()
      } = options;

      const [
        totalActivities,
        userActivities,
        suspiciousActivities,
        activityTrends,
        topActions
      ] = await Promise.all([
        UserActivity.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate }
        }),
        UserActivity.getActivityStats({
          startDate,
          endDate,
          groupBy: 'userId'
        }),
        UserActivity.getSuspiciousActivity({
          startDate,
          endDate
        }),
        UserActivity.getActivityTrends({
          startDate,
          endDate,
          groupBy: 'day'
        }),
        UserActivity.getActivityStats({
          startDate,
          endDate,
          groupBy: 'action'
        })
      ]);

      return {
        totalActivities,
        userActivities,
        suspiciousActivities,
        activityTrends,
        topActions,
        period: {
          startDate,
          endDate
        }
      };
    } catch (error) {
      console.error('Error getting admin dashboard data:', error);
      throw error;
    }
  }

  // Clean up old activities (for maintenance)
  static async cleanupOldActivities(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await UserActivity.deleteMany({
        createdAt: { $lt: cutoffDate },
        severity: { $in: ['low', 'medium'] } // Keep high and critical severity activities
      });

      return {
        deletedCount: result.deletedCount,
        cutoffDate
      };
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
      throw error;
    }
  }
}

module.exports = ActivityTracker;
