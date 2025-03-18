import React, { useState } from 'react';

function TripForm({ onTripSubmit, isLoading }) {
  const [currentLocation, setCurrentLocation] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [cycleHours, setCycleHours] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onTripSubmit({
      current_location: currentLocation,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      current_cycle_used: cycleHours,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="currentLocation">Current Location:</label>
        <input
          type="text"
          id="currentLocation"
          value={currentLocation}
          onChange={(e) => setCurrentLocation(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="pickupLocation">Pickup Location:</label>
        <input
          type="text"
          id="pickupLocation"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="dropoffLocation">Dropoff Location:</label>
        <input
          type="text"
          id="dropoffLocation"
          value={dropoffLocation}
          onChange={(e) => setDropoffLocation(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="cycleHours">Cycle Hours:</label>
        <input
          type="number"
          id="cycleHours"
          value={cycleHours}
          onChange={(e) => setCycleHours(parseFloat(e.target.value))}
          disabled={isLoading}
          min="0"
          step="0.5"
        />
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Submit'}
      </button>
    </form>
  );
}

export default TripForm;