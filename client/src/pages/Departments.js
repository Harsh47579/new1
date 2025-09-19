import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  UserMinus
} from 'lucide-react';
import clsx from 'clsx';

const Departments = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showWorkersModal, setShowWorkersModal] = useState(null);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [isAddingWorkers, setIsAddingWorkers] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch departments
  const { data: departmentsData, isLoading } = useQuery(
    ['departments', searchTerm, filterCategory, filterStatus],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus !== 'all') params.append('isActive', filterStatus);
      
      const response = await axios.get(`/api/departments?${params.toString()}`);
      return response.data;
    },
    {
      refetchOnWindowFocus: false
    }
  );

  // Fetch all users for worker assignment
  const { data: usersData } = useQuery(
    'all-users',
    async () => {
      const response = await axios.get('/api/users');
      return response.data;
    },
    {
      enabled: showWorkersModal !== null
    }
  );

  // Create department mutation
  const createDepartmentMutation = useMutation(
    async (departmentData) => {
      console.log('Creating department with data:', departmentData);
      const response = await axios.post('/api/departments', departmentData);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Department created successfully!');
        queryClient.invalidateQueries('departments');
        setIsModalOpen(false);
      },
      onError: (error) => {
        console.error('Create department error:', error);
        console.error('Error response:', error.response?.data);
        
        if (error.response?.data?.errors) {
          // Handle validation errors
          const errorMessages = error.response.data.errors.map(err => 
            `${err.field}: ${err.message}`
          ).join(', ');
          toast.error(`Validation failed: ${errorMessages}`);
        } else if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error('Failed to create department. Please try again.');
        }
      }
    }
  );

  // Update department mutation
  const updateDepartmentMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/departments/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Department updated successfully!');
        queryClient.invalidateQueries('departments');
        setIsModalOpen(false);
        setEditingDepartment(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update department');
      }
    }
  );

  // Delete department mutation
  const deleteDepartmentMutation = useMutation(
    async (id) => {
      const response = await axios.delete(`/api/departments/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Department deleted successfully!');
        queryClient.invalidateQueries('departments');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete department');
      }
    }
  );

  // Add worker mutation
  const addWorkerMutation = useMutation(
    async ({ departmentId, workerId }) => {
      const response = await axios.post(`/api/departments/${departmentId}/workers`, { workerId });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Worker added successfully!');
        queryClient.invalidateQueries('departments');
        setShowWorkersModal(null);
        setSelectedWorkers([]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add worker');
      }
    }
  );

  // Remove worker mutation
  const removeWorkerMutation = useMutation(
    async ({ departmentId, workerId }) => {
      const response = await axios.delete(`/api/departments/${departmentId}/workers/${workerId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Worker removed successfully!');
        queryClient.invalidateQueries('departments');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to remove worker');
      }
    }
  );

  const handleSubmit = (formData) => {
    console.log('Submitting department data:', formData);
    
    // Filter out empty values to avoid validation errors
    const cleanedData = {
      name: formData.name,
      email: formData.email,
      description: formData.description,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      headOfDepartment: formData.headOfDepartment || undefined,
      categories: formData.categories,
      workingHours: formData.workingHours,
      responseTime: formData.responseTime,
      isActive: formData.isActive
    };
    
    // Remove undefined values
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === undefined || cleanedData[key] === '') {
        delete cleanedData[key];
      }
    });
    
    console.log('Cleaned department data:', cleanedData);
    
    if (editingDepartment) {
      updateDepartmentMutation.mutate({
        id: editingDepartment._id,
        data: cleanedData
      });
    } else {
      createDepartmentMutation.mutate(cleanedData);
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setIsModalOpen(true);
  };

  const handleDelete = (department) => {
    if (window.confirm(`Are you sure you want to delete "${department.name}"?`)) {
      deleteDepartmentMutation.mutate(department._id);
    }
  };

  const handleAddWorkers = (department) => {
    setShowWorkersModal(department);
    setSelectedWorkers([]);
  };

  const handleWorkerSelect = (workerId) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleAddSelectedWorkers = () => {
    selectedWorkers.forEach(workerId => {
      addWorkerMutation.mutate({
        departmentId: showWorkersModal._id,
        workerId
      });
    });
  };

  const handleRemoveWorker = (departmentId, workerId) => {
    if (window.confirm('Are you sure you want to remove this worker?')) {
      removeWorkerMutation.mutate({ departmentId, workerId });
    }
  };

  const categories = [
    'Road & Pothole Issues',
    'Streetlight Problems',
    'Waste Management',
    'Water Supply',
    'Sewage & Drainage',
    'Public Safety',
    'Parks & Recreation',
    'Traffic Management',
    'Other'
  ];

  const departments = departmentsData?.departments || [];

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-dark-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Departments</h1>
            <p className="text-dark-400">Manage departments and their workers</p>
          </div>
          <button
            onClick={() => {
              setEditingDepartment(null);
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center space-x-2 mt-4 sm:mt-0"
          >
            <Plus size={20} />
            <span>Add Department</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Departments Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((department) => (
              <div key={department._id} className="bg-dark-800 rounded-lg p-6 hover:bg-dark-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{department.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-dark-400">
                      <Mail size={16} />
                      <span>{department.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(department)}
                      className="p-2 text-dark-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(department)}
                      className="p-2 text-dark-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-dark-300 text-sm mb-4 line-clamp-2">{department.description}</p>

                <div className="space-y-2 mb-4">
                  {department.phone && (
                    <div className="flex items-center space-x-2 text-sm text-dark-400">
                      <Phone size={16} />
                      <span>{department.phone}</span>
                    </div>
                  )}
                  {department.address && (
                    <div className="flex items-center space-x-2 text-sm text-dark-400">
                      <MapPin size={16} />
                      <span className="truncate">{department.address}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-dark-400">
                    <Clock size={16} />
                    <span>{department.workingHours?.start} - {department.workingHours?.end}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {department.isActive ? (
                      <CheckCircle className="text-green-500" size={16} />
                    ) : (
                      <XCircle className="text-red-500" size={16} />
                    )}
                    <span className="text-sm text-dark-400">
                      {department.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-dark-400">
                    <Users size={16} />
                    <span>{department.workers?.length || 0} workers</span>
                  </div>
                </div>

                {department.categories && department.categories.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {department.categories.map((category, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary-600 text-primary-100 text-xs rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAddWorkers(department)}
                    className="flex-1 btn-outline text-sm flex items-center justify-center space-x-1"
                  >
                    <UserPlus size={16} />
                    <span>Manage Workers</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {departments.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Departments Found</h3>
            <p className="text-dark-400 mb-6">Get started by creating your first department.</p>
            <button
              onClick={() => {
                setEditingDepartment(null);
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <Plus size={20} />
              <span>Add Department</span>
            </button>
          </div>
        )}
      </div>

      {/* Department Modal */}
      {isModalOpen && (
        <DepartmentModal
          department={editingDepartment}
          onClose={() => {
            setIsModalOpen(false);
            setEditingDepartment(null);
          }}
          onSubmit={handleSubmit}
          isLoading={createDepartmentMutation.isLoading || updateDepartmentMutation.isLoading}
        />
      )}

      {/* Workers Modal */}
      {showWorkersModal && (
        <WorkersModal
          department={showWorkersModal}
          users={usersData?.users || []}
          selectedWorkers={selectedWorkers}
          onWorkerSelect={handleWorkerSelect}
          onAddWorkers={handleAddSelectedWorkers}
          onRemoveWorker={handleRemoveWorker}
          onClose={() => {
            setShowWorkersModal(null);
            setSelectedWorkers([]);
          }}
          isLoading={addWorkerMutation.isLoading}
        />
      )}
    </div>
  );
};

// Department Modal Component
const DepartmentModal = ({ department, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: department?.name || '',
    email: department?.email || '',
    description: department?.description || '',
    phone: department?.phone || '',
    address: department?.address || '',
    headOfDepartment: department?.headOfDepartment?._id || '',
    categories: department?.categories || [],
    workingHours: {
      start: department?.workingHours?.start || '09:00',
      end: department?.workingHours?.end || '17:00'
    },
    responseTime: department?.responseTime || 24,
    isActive: department?.isActive ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form data being submitted:', formData);
    onSubmit(formData);
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const categories = [
    'Road & Pothole Issues',
    'Streetlight Problems',
    'Waste Management',
    'Water Supply',
    'Sewage & Drainage',
    'Public Safety',
    'Parks & Recreation',
    'Traffic Management',
    'Other'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-2xl font-bold text-white">
            {department ? 'Edit Department' : 'Add New Department'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input w-full"
                placeholder="Department name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input w-full"
                placeholder="department@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Description *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input w-full"
              placeholder="Department description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input w-full"
                placeholder="10-digit phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Response Time (hours)</label>
              <input
                type="number"
                min="1"
                max="168"
                value={formData.responseTime}
                onChange={(e) => setFormData(prev => ({ ...prev, responseTime: parseInt(e.target.value) }))}
                className="input w-full"
                placeholder="24"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input w-full"
              placeholder="Department address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Working Hours Start</label>
              <input
                type="time"
                value={formData.workingHours.start}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  workingHours: { ...prev.workingHours, start: e.target.value }
                }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Working Hours End</label>
              <input
                type="time"
                value={formData.workingHours.end}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  workingHours: { ...prev.workingHours, end: e.target.value }
                }))}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Categories</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map(category => (
                <label key={category} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="rounded border-dark-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-white">{category}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-dark-600 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-white">Active Department</label>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (department ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Workers Modal Component
const WorkersModal = ({ 
  department, 
  users, 
  selectedWorkers, 
  onWorkerSelect, 
  onAddWorkers, 
  onRemoveWorker, 
  onClose, 
  isLoading 
}) => {
  const availableWorkers = users.filter(user => 
    user.role === 'worker' && 
    !department.workers?.some(worker => worker._id === user._id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-2xl font-bold text-white">
            Manage Workers - {department.name}
          </h2>
        </div>
        
        <div className="p-6">
          {/* Current Workers */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Current Workers</h3>
            {department.workers && department.workers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {department.workers.map(worker => (
                  <div key={worker._id} className="bg-dark-700 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">{worker.name}</h4>
                      <p className="text-dark-400 text-sm">{worker.email}</p>
                    </div>
                    <button
                      onClick={() => onRemoveWorker(department._id, worker._id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <UserMinus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-400">No workers assigned to this department.</p>
            )}
          </div>

          {/* Add Workers */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Add Workers</h3>
            {availableWorkers.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableWorkers.map(worker => (
                    <label key={worker._id} className="flex items-center space-x-3 bg-dark-700 rounded-lg p-4 cursor-pointer hover:bg-dark-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedWorkers.includes(worker._id)}
                        onChange={() => onWorkerSelect(worker._id)}
                        className="rounded border-dark-600 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <h4 className="text-white font-medium">{worker.name}</h4>
                        <p className="text-dark-400 text-sm">{worker.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                
                {selectedWorkers.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={onAddWorkers}
                      disabled={isLoading}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <UserPlus size={20} />
                      <span>Add Selected Workers ({selectedWorkers.length})</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-dark-400">No available workers to add.</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-dark-700 flex justify-end">
          <button
            onClick={onClose}
            className="btn-outline"
            disabled={isLoading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Departments;
