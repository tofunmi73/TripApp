import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const orsApiKey = '5b3ce3597851110001cf6248b9f7180e99184d30a540eeb335a220ec';

function MapView({ start, end, current, isLoading, onLoadingChange }) {
  const mapInstanceRef = useRef(null);

  // I'm adding a flag to prevent duplicate API calls
  const requestInProgress = useRef(false);

  // I'm keeping local loading state for internal operations
  const [localIsLoading, setLocalIsLoading] = useState(isLoading !== undefined ? isLoading : false);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // FuelStopsToRoute code
const addFuelStopsToRoute = (routeCoordinates, map) => {
  // Calculate distances between each point
  const distancesInMeters = [];
  let cumulativeDistances = [0]; // First point is at 0 distance
  
  for (let i = 1; i < routeCoordinates.length; i++) {
    const prevPoint = L.latLng(routeCoordinates[i-1]);
    const currPoint = L.latLng(routeCoordinates[i]);
    const segmentDistance = prevPoint.distanceTo(currPoint);
    distancesInMeters.push(segmentDistance);
    cumulativeDistances.push(cumulativeDistances[i-1] + segmentDistance);
  }
  
  // Convert to miles
  const cumulativeMiles = cumulativeDistances.map(d => d / 1609.34);
  const totalMiles = cumulativeMiles[cumulativeMiles.length - 1];
  
  // Create a custom fuel icon
  const fuelIcon = L.divIcon({
    html: '<div style="background-color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; justify-content: center; align-items: center; border: 2px solid black; font-weight: bold;">F</div>',
    className: 'fuel-stop-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  
  // Place fuel stops every 1000 miles
  for (let targetMiles = 1000; targetMiles < totalMiles; targetMiles += 1000) {
    // Find the closest point to this mileage
    let closestPointIndex = 0;
    for (let i = 0; i < cumulativeMiles.length; i++) {
      if (cumulativeMiles[i] > targetMiles) {
        closestPointIndex = i;
        break;
      }
    }
    
    // Create a marker for the fuel stop
    const fuelMarker = L.marker(routeCoordinates[closestPointIndex], { icon: fuelIcon })
      .addTo(map)
      .bindPopup(`Fuel Stop: ${Math.round(targetMiles)} miles`);
  }
};

  // This updates local loading state when prop changes
  useEffect(() => {
    if (isLoading !== undefined) {
      setLocalIsLoading(isLoading);
    }
  }, [isLoading]);

  // This syncs local loading state with App.js
  useEffect(() => {
    if (onLoadingChange && localIsLoading !== isLoading && isLoading !== undefined) {
      onLoadingChange(localIsLoading);
    }
  }, [localIsLoading]);

  // This initializes map once when component mounts
  useEffect(() => {
    const initializeMap = () => {
      const mapElement = document.getElementById('map');
      
      if (!mapElement) {
        console.error('Map container not found.');
        return false;
      }
      
      try {
        const map = L.map('map').setView([39.8283, -98.5795], 4); // Center on US initially
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        mapInstanceRef.current = map;
        
        // Add a small delay to ensure the map is fully rendered
        setTimeout(() => {
          setMapReady(true);
        }, 500);
        
        return true;
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Error initializing map. Please refresh the page.');
        return false;
      }
    };

    if (!mapInstanceRef.current) {
      initializeMap();
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // This would get and draw routes when coordinates are available
  useEffect(() => {
    
    // Only proceed if map is initialized, ready and all coordinates are available
    if (!mapInstanceRef.current || !mapReady || !start || !end || !current) {
      return;
    }

    // To prevent duplicate requests while one is in progress
    if (requestInProgress.current) {
      return;
    }

    const map = mapInstanceRef.current;
    
    // To clear existing layers before drawing new routes
    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    setLocalIsLoading(true);
    if (onLoadingChange) {
      onLoadingChange(true);
    }
    setError(null);

    // For custom icon for location markers
    const locationIcon = L.icon({
      iconUrl: './icons-location.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      shadowSize: [41, 41]
    });

    // Add markers for each location
    L.marker([current.lat, current.lng], { icon: locationIcon })
      .addTo(map)
      .bindPopup('Current Location');
    
    L.marker([start.lat, start.lng], { icon: locationIcon })
      .addTo(map)
      .bindPopup('Pickup Location');
    
    L.marker([end.lat, end.lng], { icon: locationIcon })
      .addTo(map)
      .bindPopup('Dropoff Location');

    // Fit map to bounds with all coordinates before fetching routes
    const bounds = L.latLngBounds([
      [current.lat, current.lng],
      [start.lat, start.lng],
      [end.lat, end.lng]
    ]);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Fetch routes
    const fetchRoutes = async () => {
      requestInProgress.current = true;
      try {
        // Fetch route from current to pickup
        const currentToPickup = await axios.get(
          `https://api.openrouteservice.org/v2/directions/driving-hgv?api_key=${orsApiKey}&start=${current.lng},${current.lat}&end=${start.lng},${start.lat}`
        );

        // Wait a second before making the second call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch route from pickup to dropoff
        const pickupToDropoff = await axios.get(
          `https://api.openrouteservice.org/v2/directions/driving-hgv?api_key=${orsApiKey}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`
        );

        // Draw first route (current to pickup) in blue
        if (currentToPickup.data.features && currentToPickup.data.features.length > 0) {
          try {
            const coordinates = currentToPickup.data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            L.polyline(coordinates, { color: 'blue', weight: 4 })
              .addTo(map)
              .bindPopup('Current to Pickup');
            addFuelStopsToRoute(coordinates, map);
          } catch (err) {
            console.warn('Error drawing first route:', err);
          }
        }

        // Draw second route (pickup to dropoff) in green
        if (pickupToDropoff.data.features && pickupToDropoff.data.features.length > 0) {
          try {
            const coordinates = pickupToDropoff.data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            L.polyline(coordinates, { color: 'green', weight: 4 })
              .addTo(map)
              .bindPopup('Pickup to Dropoff');
            addFuelStopsToRoute(coordinates, map);
          } catch (err) {
            console.warn('Error drawing second route:', err);
          }
        }
        
        setLocalIsLoading(false);
        if (onLoadingChange) {
          onLoadingChange(false);
        }
      } catch (error) {
        console.error('Error fetching or drawing routes:', error);
        setError('Failed to load route data. Please check the console for details.');
        requestInProgress.current = false;
        setLocalIsLoading(false);
        if (onLoadingChange) {
          onLoadingChange(false);
        }
      }
    };

    // I added a small delay before fetching routes to ensure map is fully ready
    const timer = setTimeout(() => {
      fetchRoutes();
    }, 1000);

    return () => clearTimeout(timer);
    requestInProgress.current = false;
  }, [current, start, end, mapReady]);

  return (
    <div className="map-container" style={{ position: 'relative' }}>
      <div id="map" style={{ height: '400px', width: '100%', position: 'relative' }}></div>
      
      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: 'blue' }}></div>
          <span>Current to Pickup</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: 'green' }}></div>
          <span>Pickup to Dropoff</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon">F</div>
          <span>Fuel Stop</span>
        </div>
      </div>
      
      {/* Loading Indicator */}
      {localIsLoading && (
        <div className="loading-overlay">
          Loading routes...
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <style jsx>{`
        .map-legend {
          background: white;
          padding: 10px;
          border-radius: 4px;
          box-shadow: 0 1px 5px rgba(0,0,0,0.2);
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
  
        .legend-item {
          display: flex;
          align-items: center;
          margin-right: 15px;
        }
  
        .color-box {
          width: 16px;
          height: 6px;
          margin-right: 6px;
        }
  
        .legend-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: white;
          border: 2px solid black;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          font-size: 12px;
          margin-right: 6px;
        }
        
        .loading-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(255, 255, 255, 0.7);
          padding: 10px;
          border-radius: 5px;
          z-index: 1000;
        }
        
        .error-message {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(255, 0, 0, 0.7);
          color: white;
          padding: 10px;
          border-radius: 5px;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
}

export default MapView;