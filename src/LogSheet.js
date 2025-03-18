import React, { useEffect, useRef, useState } from 'react';
import { calculateDrivingTime } from './timeCalculations';
import './LogSheet.css';


const TripSummary = ({ tripData }) => {
  return (
    <div className="trip-summary">
      <h3>Trip Summary</h3>
      <div className="summary-grid">
        <div className="summary-item">
          <div className="summary-label">Current Location</div>
          <div className="summary-value">{tripData.current_location}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Pickup</div>
          <div className="summary-value">{tripData.pickup_location}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Dropoff</div>
          <div className="summary-value">{tripData.dropoff_location}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Cycle Hours Used</div>
          <div className="summary-value">{tripData.current_cycle_used} hrs</div>
        </div>
      </div>
    </div>
  );
};

function LogSheet({ tripData, routeData }) {
  const canvasRef = useRef(null);
  const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
  const [driverName, setDriverName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mainOffice, setMainOffice] = useState('');
  const [vehicleNumbers, setVehicleNumbers] = useState('');
  const [totalMiles, setTotalMiles] = useState(0);
  const [shippingNumber, setShippingNumber] = useState('');
  const [currentStatus, setCurrentStatus] = useState('off-duty');
  const [remarks, setRemarks] = useState([]);
  const [logEntries, setLogEntries] = useState([]);

  // Status hour totals
  const [offDutyHours, setOffDutyHours] = useState(0);
  const [sleeperHours, setSleeperHours] = useState(0);
  const [drivingHours, setDrivingHours] = useState(0);
  const [onDutyHours, setOnDutyHours] = useState(0);

  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize the log sheet grid
    drawInitialGrid(canvasRef.current);
    
    // Draw any existing log entries
    if (logEntries.length > 0) {
      drawLogEntries(canvasRef.current, logEntries);
    }

    // Draw remarks
    drawRemarks(canvasRef.current);
    
    // If there's routeData, use it to calculate initial entries
    if (tripData && routeData) {
      initializeFromRouteData(tripData, routeData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripData, routeData]);
  
  const initializeFromRouteData = (tripData, routeData) => {
    if (!routeData || !routeData.features || routeData.features.length === 0) return;
    
    // Calculate distance in miles
    const distanceInMeters = routeData.features?.[0]?.properties?.summary?.distance || 0;
    const distanceInMiles = distanceInMeters * 0.000621371;
    setTotalMiles(Math.round(distanceInMiles * 10) / 10);
    
    // Default start time to current hour
    const now = new Date();
    const currentHour = `${String(now.getHours()).padStart(2, '0')}:00`;
    
    // Calculate driving time from route data
    const drivingDurationHours = calculateDrivingTime(routeData);
    
    // Generate sample log entries based on route
    const entries = generateSampleLogEntries(tripData, drivingDurationHours, currentHour);
    setLogEntries(entries);
    
    // Update remarks based on entries
    const newRemarks = entries.map(entry => ({
      time: entry.startTime,
      location: entry.location,
      description: entry.description
    }));
    setRemarks(newRemarks);
    
    // Calculate hours and update miles
    calculateStatusHours(entries);
    updateMiles(entries);
    
    // Draw the entries on the grid
    if (canvasRef.current) {
      drawLogEntries(canvasRef.current, entries);
      drawRemarks(canvasRef.current);
    }
  };
  
  const calculateStatusHours = (entries) => {
    let offDuty = 0;
    let sleeper = 0;
    let driving = 0;
    let onDuty = 0;
    
    entries.forEach(entry => {
      const duration = calculateDurationHours(entry.startTime, entry.endTime);
      
      // Skip invalid durations
      if (isNaN(duration)) return;
      
      switch (entry.type) {
        case 'off-duty':
          offDuty += duration;
          break;
        case 'sleeper':
          sleeper += duration;
          break;
        case 'driving':
          driving += duration;
          break;
        case 'on-duty':
          onDuty += duration;
          break;
        default:
          break;
      }
    });
    
    // Ensure I don't set state to NaN values
    setOffDutyHours(isNaN(offDuty) ? 0 : Math.round(offDuty * 100) / 100);
    setSleeperHours(isNaN(sleeper) ? 0 : Math.round(sleeper * 100) / 100);
    setDrivingHours(isNaN(driving) ? 0 : Math.round(driving * 100) / 100);
    setOnDutyHours(isNaN(onDuty) ? 0 : Math.round(onDuty * 100) / 100);
  };

  const updateMiles = (entries) => {
    
    let drivingEntries = entries.filter(entry => entry.type === 'driving');
    let totalDrivingHours = 0;
    
    drivingEntries.forEach(entry => {
      if (entry.endTime) { // Only count completed entries
        totalDrivingHours += calculateDurationHours(entry.startTime, entry.endTime);
      }
    });
    
    // Assuming average speed of 55 mph for the truck
    const estimatedMiles = Math.round(totalDrivingHours * 55);
    setTotalMiles(estimatedMiles);
  };
  
  const calculateDurationHours = (start, end) => {
    // Return 0 if either start or end is missing or empty
    if (!start || !end || start === '' || end === '') {
      return 0;
    }
    
    try {
      const [startHours, startMinutes] = start.split(':').map(Number);
      const [endHours, endMinutes] = end.split(':').map(Number);
      
      // Check if any of the parsed values are NaN
      if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) {
        return 0;
      }
      
      let startTotalMinutes = startHours * 60 + startMinutes;
      let endTotalMinutes = endHours * 60 + endMinutes;
      
      // Handle case where end time is on the next day
      if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }
      
      return (endTotalMinutes - startTotalMinutes) / 60;
    } catch (error) {
      console.error("Error calculating duration:", error);
      return 0;
    }
  };

  const generateSampleLogEntries = (tripData, drivingHours, startTime) => {
    const entries = [];
    
    // Extract locations from tripData
    const startLocation = tripData?.current_location || "Starting Location";
    const pickupLocation = tripData?.pickup_location || "Pickup Location";
    const dropoffLocation = tripData?.dropoff_location || "Dropoff Location";
    
    // Parse startTime to get the starting hour
    let startHour = 8; // Default to 8 AM if parsing fails
    if (startTime) {
      const [hours] = startTime.split(':').map(Number);
      if (!isNaN(hours)) {
        startHour = hours;
      }
    }
    
    // Calculate driving segments based on actual driving hours
    // Split driving into two segments with a break in the middle
    const totalDrivingHours = drivingHours || 8; // Default to 8 hours if not provided
    const firstDrivingSegment = Math.round(totalDrivingHours * 0.45 * 10) / 10; // 45% of time
    const secondDrivingSegment = Math.round(totalDrivingHours * 0.55 * 10) / 10; // 55% of time
    
    // Calculate all time segments
    const offDutyMorningEnd = startHour;
    const sleeperBerthEnd = offDutyMorningEnd + 1.5; // 1.5 hour rest before driving
    const firstDrivingEnd = sleeperBerthEnd + firstDrivingSegment;
    const loadingEnd = firstDrivingEnd + 1.5; // 1.5 hours for loading
    const secondDrivingEnd = loadingEnd + secondDrivingSegment;
    const unloadingEnd = secondDrivingEnd + 1; // 1 hour for unloading
    
    // Format times as HH:MM
    const formatTime = (hours) => {
      const h = Math.floor(hours) % 24;
      const m = Math.round((hours - Math.floor(hours)) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    
    // Create entries based on calculated times
    entries.push({
      type: 'off-duty',
      status: 'Off Duty',
      location: startLocation,
      description: 'Off duty',
      startTime: '00:00',
      endTime: formatTime(offDutyMorningEnd),
    });
    
    entries.push({
      type: 'sleeper',
      status: 'Sleeper Berth',
      location: startLocation,
      description: 'Rest period',
      startTime: formatTime(offDutyMorningEnd),
      endTime: formatTime(sleeperBerthEnd),
    });
    
    entries.push({
      type: 'driving',
      status: 'Driving',
      location: startLocation,
      description: 'Driving to pickup',
      startTime: formatTime(sleeperBerthEnd),
      endTime: formatTime(firstDrivingEnd),
    });
    
    entries.push({
      type: 'on-duty',
      status: 'On Duty (Not Driving)',
      location: pickupLocation,
      description: 'Loading cargo',
      startTime: formatTime(firstDrivingEnd),
      endTime: formatTime(loadingEnd),
    });
    
    entries.push({
      type: 'driving',
      status: 'Driving',
      location: pickupLocation,
      description: 'Driving to destination',
      startTime: formatTime(loadingEnd),
      endTime: formatTime(secondDrivingEnd),
    });
    
    entries.push({
      type: 'on-duty',
      status: 'On Duty (Not Driving)',
      location: dropoffLocation,
      description: 'Unloading cargo',
      startTime: formatTime(secondDrivingEnd),
      endTime: formatTime(unloadingEnd),
    });
    
    // Add remaining time as off-duty
    entries.push({
      type: 'off-duty',
      status: 'Off Duty',
      location: dropoffLocation,
      description: 'Off duty',
      startTime: formatTime(unloadingEnd),
      endTime: '23:59',
    });
    
    return entries;
  };

  // const generateSampleLogEntries = (tripData, drivingHours, startTime) => {
    
  //   const entries = [];
  //   let currentTime = startTime;
    
    
  //   entries.push({
  //     type: 'off-duty',
  //     status: 'Off Duty',
  //     location: 'Richmond, VA',
  //     description: 'Off duty',
  //     startTime: '00:00',
  //     endTime: '06:00',
  //   });
    
  //   // Sleeper berth period
  //   entries.push({
  //     type: 'sleeper',
  //     status: 'Sleeper Berth',
  //     location: 'Richmond, VA',
  //     description: 'Rest period',
  //     startTime: '06:00',
  //     endTime: '07:45',
  //   });
    
  //   // Driving period
  //   entries.push({
  //     type: 'driving',
  //     status: 'Driving',
  //     location: 'Fredericksburg, VA',
  //     description: 'Driving to pickup',
  //     startTime: '07:45',
  //     endTime: '10:30',
  //   });
    
  //   // On duty period
  //   entries.push({
  //     type: 'on-duty',
  //     status: 'On Duty (Not Driving)',
  //     location: 'Baltimore, MD',
  //     description: 'Loading cargo',
  //     startTime: '10:30',
  //     endTime: '12:00',
  //   });
    
  //   // More driving
  //   entries.push({
  //     type: 'driving',
  //     status: 'Driving',
  //     location: 'Baltimore, MD',
  //     description: 'Driving to destination',
  //     startTime: '12:00',
  //     endTime: '15:00',
  //   });
    
  //   // On duty again
  //   entries.push({
  //     type: 'on-duty',
  //     status: 'On Duty (Not Driving)',
  //     location: 'Philadelphia, PA',
  //     description: 'Unloading cargo',
  //     startTime: '15:00',
  //     endTime: '16:30',
  //   });
    
  //   // More driving
  //   entries.push({
  //     type: 'driving',
  //     status: 'Driving',
  //     location: 'Philadelphia, PA',
  //     description: 'Driving to final destination',
  //     startTime: '16:30',
  //     endTime: '19:00',
  //   });
    
  //   // Off duty end period
  //   entries.push({
  //     type: 'off-duty',
  //     status: 'Off Duty',
  //     location: 'Newark, NJ',
  //     description: 'Off duty',
  //     startTime: '19:00',
  //     endTime: '23:59',
  //   });
    
  //   return entries;
  // };
  
  const drawInitialGrid = (canvas) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    // Draw grid background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw hour markers
    const hourWidth = (width - 100) / 24;
    
    // Draw row headers
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    
    const rowLabels = [
      { text: 'Off Duty', y: 40 },
      { text: 'Sleeper Berth', y: 70 },
      { text: 'Driving', y: 100 },
      { text: 'On Duty (Not Driving)', y: 130 }
    ];
    
    rowLabels.forEach(label => {
      ctx.fillText(label.text, 90, label.y);
    });
    
    // Draw horizontal lines for status rows
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(100, 20 + i * 30);
      ctx.lineTo(width - 20, 20 + i * 30);
      ctx.stroke();
    }
    
    // Draw vertical hour lines and hour markers
    for (let i = 0; i <= 24; i++) {
      const x = 100 + i * hourWidth;
      
      // Hour line
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, 140);
      ctx.stroke();
      
      // Hour text
      if (i < 24) {
        ctx.fillStyle = '#000';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(i), x + hourWidth/2, 15);
        
        // Quarter-hour marks
        for (let j = 1; j < 4; j++) {
          const xMinute = x + j * (hourWidth / 4);
          ctx.beginPath();
          ctx.moveTo(xMinute, 20);
          ctx.lineTo(xMinute, 140);
          ctx.setLineDash([1, 1]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    
    // Add midnight and noon labels
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Midnight', 100, 10);
    ctx.fillText('Noon', 100 + 12 * hourWidth, 10);
    ctx.fillText('Midnight', width - 20, 10);
    
    // Draw remarks section
    // ctx.beginPath();
    // ctx.moveTo(100, 170);
    // ctx.lineTo(width - 20, 170);
    // ctx.stroke();
    
    // ctx.fillStyle = '#000';
    // ctx.font = '10px Arial';
    // ctx.textAlign = 'right';
    // ctx.fillText('REMARKS', 90, 180);

    // Draw remarks section on the canvas
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('REMARKS', 90, 180);
    
    // Draw a line for the remarks section
    ctx.beginPath();
    ctx.moveTo(100, 180);
    ctx.lineTo(width - 20, 180);
    ctx.stroke();
  };

  const drawRemarks = (canvas) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    
    // Clear existing remarks area
    ctx.fillStyle = '#fff';
    ctx.fillRect(100, 180, width - 120, 200);
    
    // Draw remarks
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    let yPosition = 200;
    remarks.forEach((remark, index) => {
      const remarkText = `${remark.time} - ${remark.location}: ${remark.description}`;
      ctx.fillText(remarkText, 110, yPosition);
      yPosition += 20; // Space between remarks
    });
  };
  
  const drawLogEntries = (canvas, entries) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const hourWidth = (width - 100) / 24;
    
    entries.forEach(entry => {
      const startTimeMinutes = timeToMinutes(entry.startTime);
      const endTimeMinutes = timeToMinutes(entry.endTime);
      
      const startX = 100 + (startTimeMinutes / 1440) * (width - 120);
      const endX = 100 + (endTimeMinutes / 1440) * (width - 120);
      
      let rowY;
      switch (entry.type) {
        case 'off-duty':
          rowY = 40;
          break;
        case 'sleeper':
          rowY = 70;
          break;
        case 'driving':
          rowY = 100;
          break;
        case 'on-duty':
          rowY = 130;
          break;
        default:
          rowY = 40;
      }
      
      // Draw horizontal status line
      ctx.beginPath();
      ctx.moveTo(startX, rowY);
      ctx.lineTo(endX, rowY);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0066cc';
      ctx.stroke();
      
      // Mark status change with a vertical line
      if (entry !== entries[0]) {
        const previousEntry = entries[entries.indexOf(entry) - 1];
        const previousRowY = getRowYForType(previousEntry.type);
        
        ctx.beginPath();
        ctx.moveTo(startX, previousRowY);
        ctx.lineTo(startX, rowY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0066cc';
        ctx.stroke();
      }
    });
    
    // Reset line width and style
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000';
  };
  
  const getRowYForType = (type) => {
    switch (type) {
      case 'off-duty': return 40;
      case 'sleeper': return 70;
      case 'driving': return 100;
      case 'on-duty': return 130;
      default: return 40;
    }
  };
  
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const handleStatusChange = (newStatus) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // If there are previous entries, this should close the last one
    if (logEntries.length > 0) {
      const lastEntry = { ...logEntries[logEntries.length - 1] };
      lastEntry.endTime = currentTime;
      
      const updatedEntries = [...logEntries.slice(0, -1), lastEntry];
      
      // new status entry
      const newEntry = {
        type: newStatus,
        status: getStatusLabel(newStatus),
        location: '',
        description: '',
        startTime: currentTime,
        endTime: '', 
      };
      
      const newEntries = [...updatedEntries, newEntry];
      setLogEntries([...updatedEntries, newEntry]);

      // Recalculate hours and miles when status changes
      calculateStatusHours(newEntries);
      updateMiles(newEntries);
      
      // Redraw the log grid with updated entries
      if (canvasRef.current) {
        drawInitialGrid(canvasRef.current);
        drawLogEntries(canvasRef.current, [...updatedEntries, newEntry]);
        drawRemarks(canvasRef.current);
      }
    } else {
      // First entry of the day
      const newEntry = {
        type: newStatus,
        status: getStatusLabel(newStatus),
        location: '',
        description: '',
        startTime: currentTime,
        endTime: '', 
      };
      
      const newEntries = [newEntry];
      setLogEntries([newEntry]);
      

      // Recalculate hours and miles
      calculateStatusHours(newEntries);
      updateMiles(newEntries);

      // Redraw the log grid with the new entry
      if (canvasRef.current) {
        drawInitialGrid(canvasRef.current);
        drawLogEntries(canvasRef.current, [newEntry]);
        drawRemarks(canvasRef.current);
      }
    }
    
    setCurrentStatus(newStatus);
  };
  
  const getStatusLabel = (statusType) => {
    switch (statusType) {
      case 'off-duty': return 'Off Duty';
      case 'sleeper': return 'Sleeper Berth';
      case 'driving': return 'Driving';
      case 'on-duty': return 'On Duty (Not Driving)';
      default: return 'Unknown';
    }
  };
  
  const addRemark = (time, location, description) => {
    const newRemark = { time, location, description };
    const updatedRemarks = [...remarks, newRemark];
    setRemarks([...remarks, newRemark]);

    // Redraw canvas to show the new remark
    if (canvasRef.current) {
      drawRemarks(canvasRef.current);
    }
  };
  
  // const renderRemarks = () => {
  //   return remarks.map((remark, index) => (
  //     <div key={index} className="remark-item">
  //       <span className="remark-time">{remark.time}</span>
  //       <span className="remark-location">{remark.location}</span>
  //       <span className="remark-description">{remark.description}</span>
  //     </div>
  //   ));
  // };
  
  return (
    <div className="log-sheet-container">
      
      <TripSummary tripData={tripData} />
      
      <div className="log-header">
        <div className="log-header-row">
          <label>
            Driver Name:
            <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </label>
          <label>
            Date:
            <input type="text" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          </label>
        </div>
        <div className="log-header-row">
          <label>
            Company:
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </label>
          <label>
            Main Office:
            <input type="text" value={mainOffice} onChange={(e) => setMainOffice(e.target.value)} />
          </label>
        </div>
        <div className="log-header-row">
          <label>
            Vehicle Numbers:
            <input type="text" value={vehicleNumbers} onChange={(e) => setVehicleNumbers(e.target.value)} />
          </label>
          <label>
            Shipping Document #:
            <input type="text" value={shippingNumber} onChange={(e) => setShippingNumber(e.target.value)} />
          </label>
          <label>
            Total Miles:
            <input type="number" value={totalMiles} onChange={(e) => setTotalMiles(e.target.value)} />
          </label>
        </div>
      </div>
      
      <div className="log-grid-container">
        <canvas ref={canvasRef} width={800} height={400} />
      </div>
      
      <div className="status-controls">
        <h4>Change Status:</h4>
        <div className="status-buttons">
          <button 
            className={`status-btn ${currentStatus === 'off-duty' ? 'active' : ''}`}
            onClick={() => handleStatusChange('off-duty')}>
            Off Duty
          </button>
          <button 
            className={`status-btn ${currentStatus === 'sleeper' ? 'active' : ''}`}
            onClick={() => handleStatusChange('sleeper')}>
            Sleeper Berth
          </button>
          <button 
            className={`status-btn ${currentStatus === 'driving' ? 'active' : ''}`}
            onClick={() => handleStatusChange('driving')}>
            Driving
          </button>
          <button 
            className={`status-btn ${currentStatus === 'on-duty' ? 'active' : ''}`}
            onClick={() => handleStatusChange('on-duty')}>
            On Duty (Not Driving)
          </button>
        </div>
      </div>
      
      <div className="hour-summary">
        <div className="hour-row">
          <div className="hour-label">Off Duty Hours:</div>
          <div className="hour-value">{offDutyHours.toFixed(2)}</div>
        </div>
        <div className="hour-row">
          <div className="hour-label">Sleeper Berth Hours:</div>
          <div className="hour-value">{sleeperHours.toFixed(2)}</div>
        </div>
        <div className="hour-row">
          <div className="hour-label">Driving Hours:</div>
          <div className="hour-value">{drivingHours.toFixed(2)}</div>
        </div>
        <div className="hour-row">
          <div className="hour-label">On Duty Hours:</div>
          <div className="hour-value">{onDutyHours.toFixed(2)}</div>
        </div>
        <div className="hour-row total-row">
          <div className="hour-label">Total Hours:</div>
          <div className="hour-value">{(offDutyHours + sleeperHours + drivingHours + onDutyHours).toFixed(2)}</div>
        </div>
      </div>
      
      <div className="remarks-section">
        {/* <h4>Remarks:</h4>
        <div className="remarks-list">
          {renderRemarks()}
        </div> */}
        <div className="add-remark-form">
          <input
            type="text"
            placeholder="Time (HH:MM)"
            id="remark-time"
          />
          <input
            type="text"
            placeholder="Location"
            id="remark-location"
          />
          <input
            type="text"
            placeholder="Description"
            id="remark-description"
          />
          <button 
            onClick={() => {
              const time = document.getElementById('remark-time').value;
              const location = document.getElementById('remark-location').value;
              const description = document.getElementById('remark-description').value;
              if (time && location && description) {
                addRemark(time, location, description);
                document.getElementById('remark-time').value = '';
                document.getElementById('remark-location').value = '';
                document.getElementById('remark-description').value = '';
              }
            }}>
            Add Remark
          </button>
        </div>
      </div>
      
      
    </div>
  );
}

export default LogSheet;