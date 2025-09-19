import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, MapPin, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import useGeolocation from '../hooks/useGeolocation';
import { MAPS_CONFIG } from '../config/maps';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();

  // Use the improved geolocation hook
  const {
    location,
    isLoading: isLocationLoading,
    hasUserLocation,
    retryLocation
  } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    showToast: false,
    requireLocation: false
  });

  // Update form when location is available
  React.useEffect(() => {
    if (location) {
      setValue('location.coordinates', [location.lng, location.lat]);
    }
  }, [location, setValue]);

  const onSubmit = async (data) => {
    // Location is now optional - use fallback if not available
    const locationData = location || MAPS_CONFIG.DEFAULT_LOCATION;
    
    const result = await registerUser({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      location: {
        coordinates: data.location.coordinates || [locationData.lng, locationData.lat],
        address: data.location.address || 'Ranchi, Jharkhand',
        city: data.city || 'Ranchi',
        state: data.state || 'Jharkhand'
      }
    });

    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">JH</span>
          </div>
          <h2 className="text-3xl font-bold text-white">Create Account</h2>
          <p className="mt-2 text-dark-300">
            Join the community and help make Jharkhand better
          </p>
        </div>

        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters'
                    }
                  })}
                  type="text"
                  className="input pl-10"
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="input pl-10"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Please enter a valid 10-digit phone number'
                    }
                  })}
                  type="tel"
                  className="input pl-10"
                  placeholder="Enter your phone number"
                />
              </div>
              {errors.phone && (
                <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-dark-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-dark-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-white mb-2">
                Location Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  {...register('location.address', {
                    required: 'Address is required'
                  })}
                  type="text"
                  className="input pl-10"
                  placeholder="Enter your address"
                />
              </div>
              {errors.location?.address && (
                <p className="text-red-400 text-sm mt-1">{errors.location.address.message}</p>
              )}
              
              {/* Location Status Indicator */}
              <div className="mt-2 p-3 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-primary-500" />
                    <span className="text-sm text-white">
                      {isLocationLoading ? 'Detecting location...' : 
                       hasUserLocation ? 'Location detected' : 'Using default location'}
                    </span>
                  </div>
                  {!isLocationLoading && !hasUserLocation && (
                    <button
                      type="button"
                      onClick={retryLocation}
                      className="text-xs text-primary-400 hover:text-primary-300 underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
                {location && (
                  <div className="text-xs text-dark-300 mt-1">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    {!hasUserLocation && ' (Default: Ranchi, Jharkhand)'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-white mb-2">
                  City
                </label>
                <input
                  {...register('city')}
                  type="text"
                  className="input"
                  placeholder="City"
                  defaultValue="Ranchi"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-white mb-2">
                  State
                </label>
                <input
                  {...register('state')}
                  type="text"
                  className="input"
                  placeholder="State"
                  defaultValue="Jharkhand"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-600 rounded bg-dark-700"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-dark-300">
                I agree to the{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-400 hover:text-primary-300">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <User size={20} />
                  <span>Create Account</span>
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-dark-300">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary-400 hover:text-primary-300">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
