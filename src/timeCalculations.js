// Calculate driving time from route data
export const calculateDrivingTime = (routeData) => {
  if (!routeData || !routeData.features || routeData.features.length === 0) {
    return 0;
  }
  
  // Extract duration in seconds from route data
  const durationInSeconds = routeData.features[0].properties.summary.duration;
  
  // Convert seconds to hours
  const durationInHours = durationInSeconds / 3600;
  
  // Round to 2 decimal places for readability
  return Math.round(durationInHours * 100) / 100;
};

// Format time string (HH:MM)
export const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':').map(Number);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Calculate driving hours from log entries
export const calculateDrivingHours = (entries) => {
  return entries
    .filter(entry => entry.type === 'driving')
    .reduce((total, entry) => {
      const [startHours, startMinutes] = entry.startTime.split(':').map(Number);
      const [endHours, endMinutes] = entry.endTime.split(':').map(Number);
      
      let startTotalMinutes = startHours * 60 + startMinutes;
      let endTotalMinutes = endHours * 60 + endMinutes;
      
      // Handle case where end time is on the next day
      if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }
      
      return total + (endTotalMinutes - startTotalMinutes) / 60;
    }, 0).toFixed(2);
};

// Calculate on-duty (not driving) hours
export const calculateOnDutyHours = (entries) => {
  return entries
    .filter(entry => entry.type === 'on-duty')
    .reduce((total, entry) => {
      const [startHours, startMinutes] = entry.startTime.split(':').map(Number);
      const [endHours, endMinutes] = entry.endTime.split(':').map(Number);
      
      let startTotalMinutes = startHours * 60 + startMinutes;
      let endTotalMinutes = endHours * 60 + endMinutes;
      
      // Handle case where end time is on the next day
      if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }
      
      return total + (endTotalMinutes - startTotalMinutes) / 60;
    }, 0).toFixed(2);
};

// Calculate off-duty hours (including sleeper berth)
export const calculateOffDutyHours = (entries) => {
  return entries
    .filter(entry => entry.type === 'off-duty' || entry.type === 'sleeper')
    .reduce((total, entry) => {
      const [startHours, startMinutes] = entry.startTime.split(':').map(Number);
      const [endHours, endMinutes] = entry.endTime.split(':').map(Number);
      
      let startTotalMinutes = startHours * 60 + startMinutes;
      let endTotalMinutes = endHours * 60 + endMinutes;
      
      // Handle case where end time is on the next day
      if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }
      
      return total + (endTotalMinutes - startTotalMinutes) / 60;
    }, 0).toFixed(2);
};

// Calculate total on-duty hours (driving + on-duty not driving)
export const calculateTotalOnDutyHours = (entries) => {
  const drivingHours = parseFloat(calculateDrivingHours(entries));
  const onDutyHours = parseFloat(calculateOnDutyHours(entries));
  return (drivingHours + onDutyHours).toFixed(2);
};

// Generate log entries based on route data and HOS rules
export const calculateLogEntries = (tripData, routeData, startTime = '08:00') => {
  if (!routeData || !routeData.features || routeData.features.length === 0) {
    return [];
  }

  // Implementation can be similar to your generateLogEntries function in LogSheet.js
  // This is a placeholder - you can move your implementation from LogSheet.js here
  return [];
};