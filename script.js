// API URL
const API_URL = 'https://api.thingspeak.com/channels/2910638/feeds/last.json?api_key=ZMHRMGRM8WCJWM8J';

// Gas level threshold for alert
const GAS_THRESHOLD = 400;

// Function to initialize the page based on home number
function initializePage(homeNumber) {
    // Set field indices based on home number
    const fields = homeNumber === 1 ? 
        { lat: 'field1', gas: 'field2', lon: 'field3' } : 
        { lat: 'field4', gas: 'field5', lon: 'field6' };
    
    // Get DOM elements
    const gasReading = document.getElementById('gas-reading');
    const gasMeter = document.getElementById('gas-meter');
    const gasStatus = document.getElementById('gas-status');
    const latitude = document.getElementById('latitude');
    const longitude = document.getElementById('longitude');
    const timestamp = document.getElementById('timestamp');
    const alertBanner = document.getElementById('alert-banner');
    const refreshBtn = document.getElementById('refresh-btn');
    const mapContainer = document.getElementById('map-container');
    
    // Initialize map variables
    let map = null;
    let marker = null;
    let mapInitialized = false;
    
    function initializeMap(lat, lon) {
        // If map is already initialized, return
        if (mapInitialized) return;
        
        // Create map if coordinates are valid
        if (isValidCoordinate(lat, lon)) {
            try {
                // Create map instance
                map = L.map('map-container').setView([lat, lon], 13);
                
                // Add OpenStreetMap tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);
                
                // Add marker
                marker = L.marker([lat, lon]).addTo(map);
                
                // Mark as initialized
                mapInitialized = true;
                
                // Remove error message if any
                if (mapContainer.querySelector('.map-error')) {
                    mapContainer.querySelector('.map-error').remove();
                }
            } catch (error) {
                console.error('Error initializing map:', error);
                showMapError('Failed to initialize map. Please try refreshing the page.');
            }
        } else {
            showMapError('Invalid coordinates received. Map cannot be displayed.');
        }
    }
    
    function showMapError(message) {
        // Don't add multiple error messages
        if (mapContainer.querySelector('.map-error')) return;
        
        // Clear map container
        mapContainer.innerHTML = '';
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'map-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        `;
        mapContainer.appendChild(errorDiv);
    }
    
    function updateMap(lat, lon, gasValue) {
        // Check if coordinates are valid
        if (!isValidCoordinate(lat, lon)) {
            lat = 11.024263995741547; // Default latitude
            lon = 77.00381178915457;  // Default longitude
        }
        
        // Initialize map if not already initialized
        if (!mapInitialized) {
            initializeMap(lat, lon);
            return;
        }
        
        try {
            // Update marker position
            marker.setLatLng([lat, lon]);
            
            // Update map view to center on marker
            map.setView([lat, lon], map.getZoom());
            
            // Update marker popup with gas info
            let gasStatus = 'Normal';
            let gasClass = 'gas-normal';
            
            if (gasValue > GAS_THRESHOLD) {
                gasStatus = 'DANGER';
                gasClass = 'gas-danger';
            } else if (gasValue > GAS_THRESHOLD * 0.7) {
                gasStatus = 'Warning';
                gasClass = 'gas-warning';
            }
            
            marker.bindPopup(`
                <strong>Home ${homeNumber}</strong><br>
                Latitude: ${lat.toFixed(5)}<br>
                Longitude: ${lon.toFixed(5)}<br>
                <div class="gas-info">Gas Level: 
                    <span class="${gasClass}">${gasValue.toFixed(2)} ppm (${gasStatus})</span>
                </div>
            `).openPopup();
        } catch (error) {
            console.error('Error updating map:', error);
            showMapError('Error updating map. Please try refreshing the page.');
        }
    }
    
    // Helper function to check if coordinates are valid
    function isValidCoordinate(lat, lon) {
        return !isNaN(lat) && !isNaN(lon) && 
               lat !== 0 && lon !== 0 && 
               Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    }
    
    // Function to fetch data from API
    async function fetchData() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            updateUI(data);
        } catch (error) {
            console.error('Error fetching data:', error);
            gasReading.textContent = 'Error loading data';
            gasStatus.textContent = 'Status: Connection error';
            gasStatus.className = 'status danger';
            showMapError('Failed to load data. Please check your connection and try again.');
        }
    }
    
    // Function to update UI with fetched data
    function updateUI(data) {
        try {
            // Get values
            const latValue = parseFloat(data[fields.lat] || '0');
            const gasValue = parseFloat(data[fields.gas] || '0');
            const lonValue = parseFloat(data[fields.lon] || '0');
            
            // Update gas reading and meter
            gasReading.textContent = gasValue.toFixed(2) + ' ppm';
            
            // Calculate percentage for meter (assuming max is 1000 ppm)
            const percentage = Math.min(gasValue / 10, 100);
            gasMeter.style.width = `${percentage}%`;
            
            // Update gas status
            if (gasValue > GAS_THRESHOLD) {
                gasStatus.textContent = 'Status: DANGER - High Gas Level';
                gasStatus.className = 'status danger';
                alertBanner.style.display = 'flex';
            } else if (gasValue > GAS_THRESHOLD * 0.7) {
                gasStatus.textContent = 'Status: Warning - Elevated Gas Level';
                gasStatus.className = 'status warning';
                alertBanner.style.display = 'none';
            } else {
                gasStatus.textContent = 'Status: Normal';
                gasStatus.className = 'status normal';
                alertBanner.style.display = 'none';
            }
            
            // Update location
            latitude.textContent = latValue.toFixed(5);
            longitude.textContent = lonValue.toFixed(5);
            
            // Update map
            updateMap(latValue, lonValue, gasValue);
            
            // Update timestamp
            const date = new Date(data.created_at);
            timestamp.textContent = date.toLocaleString();
        } catch (error) {
            console.error('Error updating UI:', error);
            gasReading.textContent = 'Error processing data';
            gasStatus.textContent = 'Status: Data error';
            gasStatus.className = 'status danger';
        }
    }
    
    // Initial data fetch
    fetchData();
    
    // Set up auto-refresh every 30 seconds
    const autoRefresh = setInterval(fetchData, 30000);
    
    // Manual refresh button
    refreshBtn.addEventListener('click', () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
        
        fetchData().then(() => {
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            }, 1000);
        }).catch(() => {
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            }, 1000);
        });
    });
    
    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(autoRefresh);
    });
}
