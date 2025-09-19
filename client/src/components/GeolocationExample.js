import React, { useState } from 'react';
import { MapPin, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import useGeolocation from '../hooks/useGeolocation';
import { MAPS_CONFIG } from '../config/maps';

/**
 * Example React component demonstrating optional geolocation with fallback
 * This component shows how to use the improved useGeolocation hook
 */
const GeolocationExample = () => {
  const [showMap, setShowMap] = useState(false);

  // Use the improved geolocation hook with optional location
  const {
    location,
    isLoading,
    error,
    hasUserLocation,
    retryLocation,
    setCustomLocation
  } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    showToast: false, // Handle toasts manually for better UX
    requireLocation: false // Make location optional
  });

  const handleCustomLocation = () => {
    // Example: Set a custom location (e.g., user selected from a list)
    const customLocation = { lat: 28.6139, lng: 77.2090 }; // New Delhi
    setCustomLocation(customLocation);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-dark-900 min-h-screen">
      <div className="bg-dark-800 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Geolocation Example with Optional Location
        </h1>
        <p className="text-dark-300 mb-6">
          This component demonstrates how to handle geolocation gracefully with fallback options.
          The map will always load, even if the user denies location access.
        </p>

        {/* Location Status */}
        <div className="bg-dark-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Location Status</h2>
            <div className="flex items-center space-x-2">
              {isLoading && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Detecting location...</span>
                </div>
              )}
              {!isLoading && hasUserLocation && (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Location detected</span>
                </div>
              )}
              {!isLoading && !hasUserLocation && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Using default location</span>
                </div>
              )}
            </div>
          </div>

          {location && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-primary-500" />
                <span className="text-white font-medium">
                  {hasUserLocation ? 'Your Current Location' : 'Default Location'}
                </span>
              </div>
              <div className="text-dark-300 text-sm">
                <div>Latitude: {location.lat.toFixed(6)}</div>
                <div>Longitude: {location.lng.toFixed(6)}</div>
                {!hasUserLocation && (
                  <div className="text-yellow-400 text-xs mt-1">
                    Fallback to Ranchi, Jharkhand
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={retryLocation}
            disabled={isLoading}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Getting Location...' : 'Get My Location'}</span>
          </button>

          <button
            onClick={handleCustomLocation}
            className="btn-outline flex items-center space-x-2"
          >
            <MapPin className="w-4 h-4" />
            <span>Use New Delhi (Example)</span>
          </button>

          <button
            onClick={() => setShowMap(!showMap)}
            className="btn-outline flex items-center space-x-2"
          >
            <MapPin className="w-4 h-4" />
            <span>{showMap ? 'Hide' : 'Show'} Map</span>
          </button>
        </div>

        {/* Map Display */}
        {showMap && (
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Map View</h3>
            <div className="bg-dark-600 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-primary-500 mx-auto mb-2" />
                <p className="text-white mb-2">Map would be centered at:</p>
                <p className="text-dark-300 text-sm">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
                <p className="text-dark-400 text-xs mt-1">
                  {hasUserLocation ? 'Your location' : 'Default location (Ranchi)'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Code Example */}
      <div className="bg-dark-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Usage Example</h2>
        <pre className="bg-dark-900 rounded-lg p-4 overflow-x-auto text-sm text-dark-300">
          <code>{`import useGeolocation from '../hooks/useGeolocation';
import { MAPS_CONFIG } from '../config/maps';

const MyComponent = () => {
  const {
    location,
    isLoading,
    error,
    hasUserLocation,
    retryLocation,
    setCustomLocation
  } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    showToast: false,
    requireLocation: false // Make location optional
  });

  // Map will always have a location (either user's or fallback)
  const mapCenter = location || MAPS_CONFIG.DEFAULT_LOCATION;

  return (
    <div>
      {isLoading && <p>Getting location...</p>}
      {hasUserLocation && <p>Using your location</p>}
      {!hasUserLocation && <p>Using default location</p>}
      
      {/* Your map component here */}
    </div>
  );
};`}</code>
        </pre>
      </div>
    </div>
  );
};

export default GeolocationExample;
