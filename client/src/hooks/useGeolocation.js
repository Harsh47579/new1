import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Default fallback location (Ranchi, Jharkhand)
const DEFAULT_LOCATION = { lat: 23.3441, lng: 85.3096 };

const useGeolocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    fallbackLocation = DEFAULT_LOCATION,
    showToast = true,
    requireLocation = false // New option to make location optional
  } = options;

  const [location, setLocation] = useState(fallbackLocation);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasUserLocation, setHasUserLocation] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      setError('Geolocation not supported');
      setIsLoading(false);
      if (requireLocation && showToast) {
        toast.error('Geolocation is not supported by this browser');
      }
      return;
    }

    const geolocationOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationData = { lat: latitude, lng: longitude };
        
        console.log('Geolocation success:', { latitude, longitude, locationData });
        setLocation(locationData);
        setHasUserLocation(true);
        setError(null);
        setIsLoading(false);
        
        if (showToast) {
          toast.success('Location detected successfully!');
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        
        // Don't show error messages if location is optional
        if (!requireLocation) {
          console.log('Using fallback location due to geolocation error');
          setLocation(fallbackLocation);
          setHasUserLocation(false);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Only show errors if location is required
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Using default location.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Using default location.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Using default location.';
            break;
          default:
            errorMessage = 'An unknown error occurred. Using default location.';
            break;
        }
        
        setError(errorMessage);
        setLocation(fallbackLocation);
        setHasUserLocation(false);
        setIsLoading(false);
        
        if (showToast) {
          toast.error(errorMessage);
        }
      },
      geolocationOptions
    );
  }, [enableHighAccuracy, timeout, maximumAge, fallbackLocation, showToast, requireLocation]);

  const retryLocation = () => {
    setIsLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setIsLoading(false);
      if (showToast) {
        toast.error('Geolocation is not supported by this browser');
      }
      return;
    }

    const geolocationOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge: 0 // Force fresh location
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationData = { lat: latitude, lng: longitude };
        
        console.log('Geolocation retry success:', { latitude, longitude, locationData });
        setLocation(locationData);
        setHasUserLocation(true);
        setError(null);
        setIsLoading(false);
        
        if (showToast) {
          toast.success('Location updated successfully!');
        }
      },
      (error) => {
        console.warn('Geolocation retry error:', error);
        setError('Failed to get location. Using default location.');
        setLocation(fallbackLocation);
        setHasUserLocation(false);
        setIsLoading(false);
        
        if (showToast) {
          toast.error('Failed to get location. Using default location.');
        }
      },
      geolocationOptions
    );
  };

  const setCustomLocation = (customLocation) => {
    setLocation(customLocation);
    setHasUserLocation(false);
    setError(null);
  };

  return {
    location,
    isLoading,
    error,
    hasUserLocation,
    retryLocation,
    setCustomLocation
  };
};

export default useGeolocation;
