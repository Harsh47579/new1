import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Building2, 
  User, 
  Send, 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  UserPlus,
  UserMinus
} from 'lucide-react';
import clsx from 'clsx';

const IssueAssignment = ({ issue, onAssignmentChange }) => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [notes, setNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const queryClient = useQueryClient();

  // Fetch departments
  const { data: departmentsData, isLoading: departmentsLoading } = useQuery(
    'departments',
    async () => {
      const response = await axios.get('/api/departments');
      return response.data;
    }
  );

  // Fetch workers for selected department
  const { data: workersData, isLoading: workersLoading } = useQuery(
    ['department-workers', selectedDepartment],
    async () => {
      if (!selectedDepartment) return { workers: [] };
      const response = await axios.get(`/api/departments/${selectedDepartment}/workers`);
      return response.data;
    },
    {
      enabled: !!selectedDepartment
    }
  );

  // Assign issue mutation
  const assignIssueMutation = useMutation(
    async (assignmentData) => {
      const response = await axios.put(`/api/issues/${issue._id}/assign`, assignmentData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Issue assigned successfully!');
        queryClient.invalidateQueries(['adminIssues']);
        queryClient.invalidateQueries(['issue', issue._id]);
        onAssignmentChange?.(data.issue);
        setIsAssigning(false);
        setSelectedDepartment('');
        setSelectedWorker('');
        setNotes('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to assign issue');
        setIsAssigning(false);
      }
    }
  );

  // Unassign issue mutation
  const unassignIssueMutation = useMutation(
    async () => {
      const response = await axios.put(`/api/issues/${issue._id}/unassign`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Issue unassigned successfully!');
        queryClient.invalidateQueries(['adminIssues']);
        queryClient.invalidateQueries(['issue', issue._id]);
        onAssignmentChange?.(data.issue);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to unassign issue');
      }
    }
  );

  // Handle department change
  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartment(departmentId);
    setSelectedWorker(''); // Reset worker selection
  };

  // Handle assignment
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedDepartment) {
      toast.error('Please select a department');
      return;
    }

    setIsAssigning(true);
    assignIssueMutation.mutate({
      departmentId: selectedDepartment,
      workerId: selectedWorker || undefined,
      notes: notes.trim() || undefined
    });
  };

  // Handle unassignment
  const handleUnassign = () => {
    if (window.confirm('Are you sure you want to unassign this issue?')) {
      unassignIssueMutation.mutate();
    }
  };

  const departments = departmentsData?.departments || [];
  const workers = workersData?.workers || [];
  const isAssigned = issue.assignedTo?.department;

  return (
    <div className="bg-dark-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Building2 size={20} className="mr-2 text-primary-400" />
          Issue Assignment
        </h3>
        {isAssigned && (
          <button
            onClick={handleUnassign}
            disabled={unassignIssueMutation.isLoading}
            className="btn-outline text-sm flex items-center space-x-1 text-red-400 hover:text-red-300"
          >
            <UserMinus size={16} />
            <span>Unassign</span>
          </button>
        )}
      </div>

      {isAssigned ? (
        // Show current assignment
        <div className="space-y-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium">Current Assignment</h4>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-sm text-green-500">Assigned</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-dark-400">Department</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Building2 size={16} className="text-primary-400" />
                  <span className="text-white">
                    {issue.assignedTo?.department?.name || 'Unknown Department'}
                  </span>
                </div>
              </div>

              {issue.assignedTo?.worker && (
                <div>
                  <label className="text-sm text-dark-400">Assigned Worker</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <User size={16} className="text-blue-400" />
                    <span className="text-white">
                      {issue.assignedTo.worker.name}
                    </span>
                  </div>
                </div>
              )}

              {issue.assignedTo?.assignedBy && (
                <div>
                  <label className="text-sm text-dark-400">Assigned By</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <User size={16} className="text-yellow-400" />
                    <span className="text-white">
                      {issue.assignedTo.assignedBy.name}
                    </span>
                  </div>
                </div>
              )}

              {issue.assignedTo?.assignedAt && (
                <div>
                  <label className="text-sm text-dark-400">Assigned At</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock size={16} className="text-dark-400" />
                    <span className="text-white">
                      {new Date(issue.assignedTo.assignedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {issue.assignedTo?.notes && (
                <div>
                  <label className="text-sm text-dark-400">Notes</label>
                  <p className="text-white mt-1 bg-dark-600 rounded p-2 text-sm">
                    {issue.assignedTo.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Assignment form
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Select Department *
            </label>
            {departmentsLoading ? (
              <div className="flex items-center space-x-2 text-dark-400">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading departments...</span>
              </div>
            ) : (
              <select
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="input w-full"
                required
              >
                <option value="">Choose a department...</option>
                {departments
                  .filter(dept => dept.isActive)
                  .map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {selectedDepartment && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Select Worker (Optional)
              </label>
              {workersLoading ? (
                <div className="flex items-center space-x-2 text-dark-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading workers...</span>
                </div>
              ) : workers.length > 0 ? (
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Choose a worker (optional)...</option>
                  {workers.map((worker) => (
                    <option key={worker._id} value={worker._id}>
                      {worker.name} ({worker.email})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-dark-700 rounded-lg p-4 text-center">
                  <AlertCircle size={20} className="text-yellow-500 mx-auto mb-2" />
                  <p className="text-dark-400 text-sm">
                    No workers available in this department
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Assignment Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input w-full"
              placeholder="Add any notes about this assignment..."
              maxLength={500}
            />
            <p className="text-xs text-dark-400 mt-1">
              {notes.length}/500 characters
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setSelectedDepartment('');
                setSelectedWorker('');
                setNotes('');
              }}
              className="btn-outline"
              disabled={isAssigning}
            >
              Clear
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2"
              disabled={isAssigning || !selectedDepartment}
            >
              {isAssigning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Assign Issue</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Department Info */}
      {selectedDepartment && (
        <div className="mt-6 p-4 bg-dark-700 rounded-lg">
          <h4 className="text-white font-medium mb-2">Department Information</h4>
          {(() => {
            const dept = departments.find(d => d._id === selectedDepartment);
            return dept ? (
              <div className="space-y-2 text-sm">
                <p className="text-dark-300">
                  <span className="text-dark-400">Description:</span> {dept.description}
                </p>
                <p className="text-dark-300">
                  <span className="text-dark-400">Email:</span> {dept.email}
                </p>
                {dept.phone && (
                  <p className="text-dark-300">
                    <span className="text-dark-400">Phone:</span> {dept.phone}
                  </p>
                )}
                <p className="text-dark-300">
                  <span className="text-dark-400">Response Time:</span> {dept.responseTime} hours
                </p>
                <p className="text-dark-300">
                  <span className="text-dark-400">Working Hours:</span> {dept.workingHours?.start} - {dept.workingHours?.end}
                </p>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default IssueAssignment;
