import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Bell, 
  Globe, 
  Shield, 
  Save,
  Eye,
  EyeOff,
  Camera,
  Settings,
  AlertCircle
} from 'lucide-react';

const AccountSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    profile: {
      bio: user?.profile?.bio || '',
      occupation: user?.profile?.occupation || '',
      organization: user?.profile?.organization || ''
    },
    location: {
      address: user?.location?.address || '',
      city: user?.location?.city || 'Ranchi',
      state: user?.location?.state || 'Jharkhand'
    }
  });

  // Settings form state
  const [settingsData, setSettingsData] = useState({
    preferences: {
      notifications: {
        email: user?.preferences?.notifications?.email ?? true,
        sms: user?.preferences?.notifications?.sms ?? true,
        push: user?.preferences?.notifications?.push ?? true
      },
      language: user?.preferences?.language || 'en',
      reportAnonymously: user?.preferences?.reportAnonymously ?? false,
      theme: user?.preferences?.theme || 'dark',
      timezone: user?.preferences?.timezone || 'Asia/Kolkata'
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (data) => {
      const response = await axios.put('/api/user/profile', data);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Profile updated successfully!');
        updateUser(data.user);
        queryClient.invalidateQueries('user-dashboard-stats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      }
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (data) => {
      const response = await axios.put('/api/user/settings', data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Settings updated successfully!');
        queryClient.invalidateQueries('user-dashboard-stats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update settings');
      }
    }
  );

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settingsData);
  };

  const handleProfileChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSettingsChange = (field, value) => {
    const keys = field.split('.');
    setSettingsData(prev => {
      const newData = { ...prev };
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-white">Account Settings</h2>
        <p className="text-dark-400">Manage your account information and preferences</p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-dark-800 rounded-lg p-1">
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-dark-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-dark-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>
          
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="input w-full"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input w-full bg-dark-700 text-dark-400"
                  placeholder="Email cannot be changed"
                />
                <p className="text-xs text-dark-400 mt-1">Email cannot be changed for security reasons</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={profileData.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className="input w-full"
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role?.replace('_', ' ').toUpperCase() || ''}
                  disabled
                  className="input w-full bg-dark-700 text-dark-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Bio</label>
              <textarea
                value={profileData.profile.bio}
                onChange={(e) => handleProfileChange('profile.bio', e.target.value)}
                className="input w-full h-24"
                placeholder="Tell us about yourself..."
                maxLength={500}
              />
              <p className="text-xs text-dark-400 mt-1">
                {profileData.profile.bio.length}/500 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Occupation</label>
                <input
                  type="text"
                  value={profileData.profile.occupation}
                  onChange={(e) => handleProfileChange('profile.occupation', e.target.value)}
                  className="input w-full"
                  placeholder="Your profession or job title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Organization</label>
                <input
                  type="text"
                  value={profileData.profile.organization}
                  onChange={(e) => handleProfileChange('profile.organization', e.target.value)}
                  className="input w-full"
                  placeholder="Company or organization name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Address</label>
              <textarea
                value={profileData.location.address}
                onChange={(e) => handleProfileChange('location.address', e.target.value)}
                className="input w-full h-20"
                placeholder="Your current address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">City</label>
                <input
                  type="text"
                  value={profileData.location.city}
                  onChange={(e) => handleProfileChange('location.city', e.target.value)}
                  className="input w-full"
                  placeholder="Your city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">State</label>
                <input
                  type="text"
                  value={profileData.location.state}
                  onChange={(e) => handleProfileChange('location.state', e.target.value)}
                  className="input w-full"
                  placeholder="Your state"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateProfileMutation.isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={18} />
                <span>{updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-dark-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Notification Preferences</h3>
          
          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-md font-medium text-white">Notification Channels</h4>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settingsData.preferences.notifications.email}
                    onChange={(e) => handleSettingsChange('preferences.notifications.email', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-primary-600 rounded border-dark-600 bg-dark-700 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-white">Email Notifications</span>
                    <p className="text-dark-400 text-sm">Receive notifications via email</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settingsData.preferences.notifications.sms}
                    onChange={(e) => handleSettingsChange('preferences.notifications.sms', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-primary-600 rounded border-dark-600 bg-dark-700 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-white">SMS Notifications</span>
                    <p className="text-dark-400 text-sm">Receive notifications via SMS</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settingsData.preferences.notifications.push}
                    onChange={(e) => handleSettingsChange('preferences.notifications.push', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-primary-600 rounded border-dark-600 bg-dark-700 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-white">Push Notifications</span>
                    <p className="text-dark-400 text-sm">Receive push notifications in browser</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateSettingsMutation.isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={18} />
                <span>{updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="bg-dark-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Privacy Settings</h3>
          
          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-md font-medium text-white">Report Privacy</h4>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settingsData.preferences.reportAnonymously}
                    onChange={(e) => handleSettingsChange('preferences.reportAnonymously', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-primary-600 rounded border-dark-600 bg-dark-700 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-white">Report Issues Anonymously</span>
                    <p className="text-dark-400 text-sm">
                      When enabled, your name will not be visible to other users on your reports
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-yellow-400 font-medium">Privacy Notice</h4>
                  <p className="text-yellow-200 text-sm mt-1">
                    Your personal information is protected and will only be used for civic issue management. 
                    Anonymous reporting helps maintain privacy while still contributing to community improvement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateSettingsMutation.isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={18} />
                <span>{updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-dark-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">General Preferences</h3>
          
          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Language</label>
                <select
                  value={settingsData.preferences.language}
                  onChange={(e) => handleSettingsChange('preferences.language', e.target.value)}
                  className="input w-full"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="bn">Bengali</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Theme</label>
                <select
                  value={settingsData.preferences.theme}
                  onChange={(e) => handleSettingsChange('preferences.theme', e.target.value)}
                  className="input w-full"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Timezone</label>
              <select
                value={settingsData.preferences.timezone}
                onChange={(e) => handleSettingsChange('preferences.timezone', e.target.value)}
                className="input w-full"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateSettingsMutation.isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={18} />
                <span>{updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
