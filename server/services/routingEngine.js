const Department = require('../models/Department');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');

class RoutingEngine {
  constructor() {
    this.departments = new Map();
    this.loadDepartments();
  }

  async loadDepartments() {
    try {
      const departments = await Department.find({ isActive: true });
      this.departments.clear();
      
      departments.forEach(dept => {
        this.departments.set(dept._id.toString(), dept);
      });
      
      console.log(`Loaded ${departments.length} departments into routing engine`);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  async routeIssue(issue) {
    try {
      const { category, location, priority } = issue;
      
      // Find best matching department
      const bestDepartment = await this.findBestDepartment(category, location, priority);
      
      if (!bestDepartment) {
        console.log('No suitable department found for issue:', issue._id);
        return null;
      }

      // Check if department has available staff
      const availableStaff = this.getAvailableStaff(bestDepartment);
      
      if (availableStaff.length === 0) {
        console.log('No available staff in department:', bestDepartment.name);
        // Still assign to department, but without specific worker
        return {
          department: bestDepartment.name,
          departmentId: bestDepartment._id,
          worker: null,
          autoAssigned: true
        };
      }

      // Find least busy staff member
      const assignedOfficer = await this.findLeastBusyStaff(bestDepartment, availableStaff);
      
      return {
        department: bestDepartment.name,
        departmentId: bestDepartment._id,
        worker: assignedOfficer._id,
        workerName: assignedOfficer.name,
        autoAssigned: true
      };
    } catch (error) {
      console.error('Error routing issue:', error);
      return null;
    }
  }

  async findBestDepartment(category, location, priority) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [deptId, department] of this.departments) {
      let score = 0;

      // Category matching (highest priority)
      if (department.categories.includes(category)) {
        score += 100;
      }

      // Location coverage
      if (department.coversLocation(location.coordinates)) {
        score += 50;
      }

      // Priority handling capability
      if (priority === 'urgent' && department.settings.maxConcurrentIssues > 5) {
        score += 30;
      }

      // Department performance
      const resolutionRate = department.stats.resolutionRate || 0;
      score += resolutionRate * 0.2;

      // Response time performance
      const avgResponseTime = department.stats.avgResponseTime || 24;
      if (avgResponseTime < 12) {
        score += 20;
      } else if (avgResponseTime < 24) {
        score += 10;
      }

      // Current workload
      const currentWorkload = await this.getDepartmentWorkload(department._id);
      const maxWorkload = department.settings.maxConcurrentIssues;
      const workloadRatio = currentWorkload / maxWorkload;
      
      if (workloadRatio < 0.5) {
        score += 25;
      } else if (workloadRatio < 0.8) {
        score += 15;
      } else if (workloadRatio >= 1.0) {
        score -= 50; // Penalty for overloaded departments
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = department;
      }
    }

    return bestMatch;
  }

  getAvailableStaff(department) {
    return department.staff.filter(staff => {
      return staff.user && staff.user.isActive;
    });
  }

  async findLeastBusyStaff(department, availableStaff) {
    let leastBusyStaff = availableStaff[0];
    let minWorkload = await this.getStaffWorkload(leastBusyStaff.user._id);

    for (let i = 1; i < availableStaff.length; i++) {
      const staff = availableStaff[i];
      const workload = await this.getStaffWorkload(staff.user._id);
      
      if (workload < minWorkload) {
        minWorkload = workload;
        leastBusyStaff = staff;
      }
    }

    return leastBusyStaff.user;
  }

  async getDepartmentWorkload(departmentId) {
    try {
      const count = await Issue.countDocuments({
        'assignedTo.department': departmentId,
        status: { $in: ['new', 'in_progress'] }
      });
      return count;
    } catch (error) {
      console.error('Error getting department workload:', error);
      return 0;
    }
  }

  async getStaffWorkload(userId) {
    try {
      const count = await Issue.countDocuments({
        'assignedTo.worker': userId,
        status: { $in: ['new', 'in_progress'] }
      });
      return count;
    } catch (error) {
      console.error('Error getting staff workload:', error);
      return 0;
    }
  }

  async autoAssignIssue(issueId) {
    try {
      const issue = await Issue.findById(issueId);
      if (!issue) {
        throw new Error('Issue not found');
      }

      const assignment = await this.routeIssue(issue);
      if (!assignment) {
        return null;
      }

      // Update issue with assignment
      issue.assignedTo = {
        department: assignment.department,
        worker: assignment.worker,
        assignedAt: new Date(),
        autoAssigned: true
      };

      // Add to timeline
      issue.timeline.push({
        status: issue.status,
        description: `Issue automatically assigned to ${assignment.department}${assignment.workerName ? ` and ${assignment.workerName}` : ''}`,
        updatedBy: null // System assignment
      });

      await issue.save();

      // Create notification for reporter
      await Notification.createNotification(
        issue.reporter,
        'issue_acknowledged',
        'Issue Assigned',
        `Your issue "${issue.title}" has been automatically assigned to ${assignment.department}`,
        { issueId: issue._id }
      );

      // Create notification for assigned worker (if any)
      if (assignment.worker) {
        await Notification.createNotification(
          assignment.worker,
          'issue_assigned',
          'New Issue Assigned',
          `You have been assigned a new issue: "${issue.title}"`,
          { issueId: issue._id }
        );
      }

      return assignment;
    } catch (error) {
      console.error('Error auto-assigning issue:', error);
      throw error;
    }
  }

  async updateDepartmentStats(departmentId) {
    try {
      const department = await Department.findById(departmentId);
      if (!department) return;

      const stats = await this.calculateDepartmentStats(departmentId);
      
      department.stats = {
        ...department.stats,
        ...stats
      };

      await department.save();
    } catch (error) {
      console.error('Error updating department stats:', error);
    }
  }

  async calculateDepartmentStats(departmentId) {
    try {
      const issues = await Issue.find({
        'assignedTo.department': departmentId
      });

      const totalIssues = issues.length;
      const resolvedIssues = issues.filter(issue => issue.status === 'resolved').length;
      
      // Calculate average response time
      let totalResponseTime = 0;
      let responseCount = 0;
      
      issues.forEach(issue => {
        if (issue.timeline.length > 1) {
          const responseTime = issue.timeline[1].updatedAt - issue.createdAt;
          totalResponseTime += responseTime;
          responseCount++;
        }
      });

      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount / (1000 * 60 * 60) : 0; // Convert to hours

      // Calculate average resolution time
      let totalResolutionTime = 0;
      let resolutionCount = 0;
      
      issues.filter(issue => issue.status === 'resolved').forEach(issue => {
        const resolutionTime = issue.resolution.resolvedAt - issue.createdAt;
        totalResolutionTime += resolutionTime;
        resolutionCount++;
      });

      const avgResolutionTime = resolutionCount > 0 ? totalResolutionTime / resolutionCount / (1000 * 60 * 60) : 0; // Convert to hours

      return {
        totalIssues,
        resolvedIssues,
        avgResponseTime,
        avgResolutionTime,
        resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0
      };
    } catch (error) {
      console.error('Error calculating department stats:', error);
      return {};
    }
  }

  // Refresh departments periodically
  startRefreshInterval(intervalMs = 5 * 60 * 1000) { // 5 minutes
    setInterval(() => {
      this.loadDepartments();
    }, intervalMs);
  }
}

module.exports = new RoutingEngine();
