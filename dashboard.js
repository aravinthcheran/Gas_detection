// Use existing API_URL if available, otherwise define it
const DASHBOARD_API_URL = 'https://api.thingspeak.com/channels/2910638/feeds/last.json?api_key=ZMHRMGRM8WCJWM8J';

// Gas level threshold for alert
const GAS_THRESHOLD = window.GAS_THRESHOLD || 400;

// Maps and markers
let maps = {
    home1: null,
    home2: null
};

let markers = {
    home1: null,
    home2: null
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard controls
    const refreshAllBtn = document.getElementById('refresh-all-btn');
    const emergencyBtn = document.getElementById('emergency-btn');
    
    // Setup refresh button
    refreshAllBtn.addEventListener('click', function() {
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
        
        fetchAllData().then(() => {
            setTimeout(() => {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh All Data';
            }, 1000);
        }).catch(() => {
            setTimeout(() => {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh All Data';
            }, 1000);
        });
    });
    
    // Setup emergency button
    emergencyBtn.addEventListener('click', function() {
        alert('Emergency contact: 911 or local emergency services\nThis is a simulation for educational purposes.');
    });
    
    // Initial data fetch
    fetchAllData();
    
    // Set up auto-refresh every 30 seconds
    const autoRefresh = setInterval(fetchAllData, 30000);
    
    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(autoRefresh);
    });
});

// Use the appropriate API URL to avoid conflicts
function getApiUrl() {
    // Use the global API_URL if available, otherwise use our local constant
    return (typeof API_URL !== 'undefined') ? API_URL : DASHBOARD_API_URL;
}

// Fetch data for all homes
async function fetchAllData() {
    try {
        const response = await fetch(getApiUrl());
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        // Update home 1 data (fields 1-3)
        updateHomeUI(1, {
            lat: parseFloat(data.field1 || '0'),
            gas: parseFloat(data.field2 || '0'),
            lon: parseFloat(data.field3 || '0')
        }, data.created_at);
        
        // Update home 2 data (fields 4-6)
        updateHomeUI(2, {
            lat: parseFloat(data.field4 || '0'),
            gas: parseFloat(data.field5 || '0'),
            lon: parseFloat(data.field6 || '0')
        }, data.created_at);
        
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        showError(1, 'Connection error');
        showError(2, 'Connection error');
        return null;
    }
}

// Update UI for a specific home
function updateHomeUI(homeNum, data, timestamp) {
    const homeId = `home${homeNum}`;
    
    // Get elements
    const meter = document.getElementById(`${homeId}-meter`);
    const reading = document.getElementById(`${homeId}-reading`);
    const status = document.getElementById(`${homeId}-status`);
    const lat = document.getElementById(`${homeId}-lat`);
    const lon = document.getElementById(`${homeId}-lon`);
    const timestampEl = document.getElementById(`${homeId}-timestamp`);
    
    // Update gas reading and meter
    reading.textContent = data.gas.toFixed(2) + ' ppm';
    
    // Calculate percentage for meter (assuming max is 1000 ppm)
    const percentage = Math.min(data.gas / 10, 100);
    meter.style.width = `${percentage}%`;
    
    // Update gas status
    if (data.gas > GAS_THRESHOLD) {
        status.innerHTML = '<div class="indicator-dot"></div><span>Status: DANGER - High Gas Level</span>';
        status.className = 'status-indicator status-danger';
    } else if (data.gas > GAS_THRESHOLD * 0.7) {
        status.innerHTML = '<div class="indicator-dot"></div><span>Status: Warning - Elevated Gas Level</span>';
        status.className = 'status-indicator status-warning';
    } else {
        status.innerHTML = '<div class="indicator-dot"></div><span>Status: Normal</span>';
        status.className = 'status-indicator status-normal';
    }
    
    // Update location
    lat.textContent = data.lat.toFixed(5);
    lon.textContent = data.lon.toFixed(5);
    
    // Update map
    updateMap(homeId, data.lat, data.lon, data.gas);
    
    // Update timestamp
    const date = new Date(timestamp);
    timestampEl.textContent = date.toLocaleString();
}

// Initialize or update map for a home
function updateMap(homeId, lat, lon, gasValue) {
    // Check if coordinates are valid
    if (!isValidCoordinate(lat, lon)) {
        lat = 11.021986996654217;
        lon = 77.00609149144587;
    }
    
    // Initialize map if not already initialized
    if (!maps[homeId]) {
        try {
            maps[homeId] = L.map(`${homeId}-map`).setView([lat, lon], 13);
            
            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 18
            }).addTo(maps[homeId]);
            
            // Add marker
            markers[homeId] = L.marker([lat, lon]).addTo(maps[homeId]);
        } catch (error) {
            console.error(`Error initializing map for ${homeId}:`, error);
            return;
        }
    } else {
        // Update marker position
        markers[homeId].setLatLng([lat, lon]);
        
        // Update map view
        maps[homeId].setView([lat, lon], maps[homeId].getZoom());
    }
    
    // Update marker popup
    let gasStatus = 'Normal';
    let gasClass = 'gas-normal';
    
    if (gasValue > GAS_THRESHOLD) {
        gasStatus = 'DANGER';
        gasClass = 'gas-danger';
    } else if (gasValue > GAS_THRESHOLD * 0.7) {
        gasStatus = 'Warning';
        gasClass = 'gas-warning';
    }
    
    // Create popup content
    const homeNum = homeId === 'home1' ? 1 : 2;
    markers[homeId].bindPopup(`
        <strong>Home ${homeNum}</strong><br>
        Gas Level: <span class="${gasClass}">${gasValue.toFixed(2)} ppm (${gasStatus})</span>
    `);
}

// Helper function to show error for a home
function showError(homeNum, errorMsg) {
    const homeId = `home${homeNum}`;
    const status = document.getElementById(`${homeId}-status`);
    const reading = document.getElementById(`${homeId}-reading`);
    
    reading.textContent = 'Error loading data';
    status.innerHTML = '<div class="indicator-dot"></div><span>Status: ' + errorMsg + '</span>';
    status.className = 'status-indicator status-danger';
}

// Helper function to check if coordinates are valid
function isValidCoordinate(lat, lon) {
    return !isNaN(lat) && !isNaN(lon) && 
           lat !== 0 && lon !== 0 && 
           Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
