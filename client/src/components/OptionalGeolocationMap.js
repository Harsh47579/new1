import React, { useState, useEffect, useRef } from 'react';
import { MapPin, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import useGeolocation from '../hooks/useGeolocation';
import { MAPS_CONFIG } from '../config/maps';

/**
 * React component demonstrating optional geolocation with Google Maps
 * This is the exact implementation you requested - map loads with fallback location
 * if user denies geolocation access or an error occurs.
 */
const OptionalGeolocationMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Use geolocation hook with optional location
  const {
    location,
    isLoading: isLocationLoading,
    hasUserLocation,
    retryLocation
  } = useGeolocation({
    fallbackLocation: MAPS_CONFIG.DEFAULT_LOCATION,
    showToast: false, // No blocking error messages
    requireLocation: false // Make location optional
  });

  // Initialize Google Maps when component mounts
  useEffect(() => {
    const initMap = () => {
      if (mapRef.current && !map && window.google) {
        const newMap = new window.google.maps.Map(mapRef.current, {
          center: location, // Will be either user location or fallback
          zoom: MAPS_CONFIG.DEFAULT_ZOOM,
          mapTypeId: 'roadmap',
          styles: MAPS_CONFIG.MAP_STYLES
        });

        // Add marker for current location
        const marker = new window.google.maps.Marker({
          position: location,
          map: newMap,
          title: hasUserLocation ? 'Your Location' : 'Default Location',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${hasUserLocation ? '#10B981' : '#F59E0B'}">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 24)
          }
        });

        setMap(newMap);
        setIsMapLoaded(true);
      }
    };

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_CONFIG.API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [location, map, hasUserLocation]);

  // Update map center when location changes
  useEffect(() => {
    if (map && location) {
      map.setCenter(location);
      // Update marker position
      const markers = map.markers || [];
      markers.forEach(marker => marker.setPosition(location));
    }
  }, [map, location]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-dark-800 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Optional Geolocation Map Example
        </h1>
        <p className="text-dark-300 mb-6">
          This map demonstrates optional geolocation behavior. If you deny location access,
          the map will load with a default fallback location (Ranchi, Jharkhand).
        </p>

        {/* Location Status */}
        <div className="bg-dark-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isLocationLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                  <span className="text-white">Detecting your location...</span>
                </>
              ) : hasUserLocation ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-white">Using your current location</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-white">Using default location (Ranchi, Jharkhand)</span>
                </>
              )}
            </div>
            
            {!isLocationLoading && (
              <button
                onClick={retryLocation}
                className="btn-outline text-sm flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Location</span>
              </button>
            )}
          </div>

          {location && (
            <div className="mt-3 text-sm text-dark-300">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-primary-500" />
                <span>
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full h-96 bg-dark-600 rounded-lg"
            style={{ minHeight: '400px' }}
          />
          
          {!isMapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark-600 rounded-lg">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
                <p className="text-white">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-blue-400 font-medium mb-2">How to Test:</h3>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• <strong>Allow location:</strong> Click "Allow" when prompted to see your actual location</li>
            <li>• <strong>Deny location:</strong> Click "Block" to see fallback behavior</li>
            <li>• <strong>No prompt:</strong> If you previously denied, click "Retry Location" to test again</li>
            <li>• <strong>Different device:</strong> Test on mobile or different browser</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OptionalGeolocationMap;
