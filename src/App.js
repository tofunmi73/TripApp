import './App.css';
import React, { useState } from 'react';
import TripForm from './TripForm';
import MapView from './MapView';
import LogSheet from './LogSheet';
import axios from 'axios';
import API_URL from './config';

function App() {
    const [tripData, setTripData] = useState(null);
    const [startCoordinates, setStartCoordinates] = useState(null);
    const [endCoordinates, setEndCoordinates] = useState(null);
    const [currentCoordinates, setCurrentCoordinates] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mapIsLoading, setMapIsLoading] = useState(false);

    const handleTripSubmit = async (formData) => {
        setIsLoading(true);
        setMapIsLoading(true);
        setError(null);
        
        try {
            console.log("Making API request to:", `${API_URL}/trips/`);
            // trying to create trip
            const tripResponse = await axios.post(`${API_URL}/trips/`, formData);
            const tripResponseData = tripResponse.data;
            setTripData(tripResponseData);
            
            // trying to geocode all locations
            const [currentLocationResponse, pickupLocationResponse, dropoffLocationResponse] = await Promise.all([
                axios.get(`${API_URL}/geocode/?address=${encodeURIComponent(tripResponseData.current_location)}`),
                axios.get(`${API_URL}/geocode/?address=${encodeURIComponent(tripResponseData.pickup_location)}`),
                axios.get(`${API_URL}/geocode/?address=${encodeURIComponent(tripResponseData.dropoff_location)}`)
            ]);
            
            // Setting coordinates
            setCurrentCoordinates({
                lat: currentLocationResponse.data.latitude,
                lng: currentLocationResponse.data.longitude
            });
            
            setStartCoordinates({
                lat: pickupLocationResponse.data.latitude,
                lng: pickupLocationResponse.data.longitude
            });
            
            setEndCoordinates({
                lat: dropoffLocationResponse.data.latitude,
                lng: dropoffLocationResponse.data.longitude
            });
            
            // I tried to keep mapIsLoading true for a moment to allow the map to start rendering
            // then it will be set to false by MapView component after routes are loaded
            
            setIsLoading(false);
        } catch (error) {
            console.error('Error processing trip data:', error);
            setError('Failed to process trip data. Please check the console for details.');
            setIsLoading(false);
            setMapIsLoading(false);
        }
    };

    // This function allows the MapView component to update the loading state
    const handleMapLoadingChange = (loadingState) => {
        setMapIsLoading(loadingState);
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Trip Planner & ELD Log Generator</h1>
            </header>
            
            <main>
                <section className="form-section">
                    <h2>Enter Trip Details</h2>
                    <TripForm onTripSubmit={handleTripSubmit} isLoading={isLoading} />
                </section>
                
                {isLoading && !mapIsLoading && (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Processing trip data...</p>
                    </div>
                )}
                
                {error && (
                    <div className="error-container">
                        <p>{error}</p>
                    </div>
                )}
                
                {(tripData && startCoordinates && endCoordinates && currentCoordinates) && (
                    <>
                        <section className="map-section">
                            <h2>Route Map</h2>
                            <MapView 
                                start={startCoordinates} 
                                end={endCoordinates} 
                                current={currentCoordinates}
                                isLoading={mapIsLoading}
                                onLoadingChange={handleMapLoadingChange}
                            />
                        </section>
                        
                        <section className="logsheet-section">
                            <h2>ELD Log Sheets</h2>
                            <LogSheet tripData={tripData} />
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}


export default App;