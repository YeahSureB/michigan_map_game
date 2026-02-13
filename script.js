// Game state
let map;
let currentCity;
let gameData = [];
let filteredCities = [];
let currentMode = '';
let roundNumber = 1;
let userMarker = null;
let actualMarker = null;
let connectionLine = null;
let hasGuessed = false;

// DOM elements
const modeSelection = document.getElementById('mode-selection');
const gameInterface = document.getElementById('game-interface');
const majorCitiesBtn = document.getElementById('major-cities-btn');
const countySeatBtn = document.getElementById('county-seats-btn');
const targetCityName = document.getElementById('target-city-name');
const resultPanel = document.getElementById('result-panel');
const resultMessage = document.getElementById('result-message');
const resultDistance = document.getElementById('result-distance');
const nextBtn = document.getElementById('next-btn');
const changeModeBtn = document.getElementById('change-mode-btn');
const roundNumberEl = document.getElementById('round-number');
const gameModeEl = document.getElementById('game-mode');

// Initialize the game
async function init() {
    // Load game data
    await loadGameData();
    
    // Set up event listeners
    majorCitiesBtn.addEventListener('click', () => startGame('major-cities'));
    countySeatBtn.addEventListener('click', () => startGame('county-seats'));
    nextBtn.addEventListener('click', nextRound);
    changeModeBtn.addEventListener('click', changeMode);
}

// Load JSON data
async function loadGameData() {
    try {
        const response = await fetch('michigan_game_data.json');
        gameData = await response.json();
        console.log(`Loaded ${gameData.length} cities from data file`);
    } catch (error) {
        console.error('Error loading game data:', error);
        alert('Error loading game data. Please ensure michigan_game_data.json is in the same directory.');
    }
}

// Start game with selected mode
function startGame(mode) {
    currentMode = mode;
    roundNumber = 1;
    
    // Filter cities based on mode
    if (mode === 'major-cities') {
        // Get top 20 cities by population
        filteredCities = [...gameData]
            .sort((a, b) => b.population - a.population)
            .slice(0, 20);
        gameModeEl.textContent = 'Major Cities';
    } else if (mode === 'county-seats') {
        // Get all county seats
        filteredCities = gameData.filter(city => city.isCountySeat === true);
        gameModeEl.textContent = 'County Seats';
    }
    
    console.log(`Starting ${mode} mode with ${filteredCities.length} cities`);
    
    // Hide mode selection and show game interface
    modeSelection.classList.add('hidden');
    gameInterface.classList.remove('hidden');
    
    // Initialize map
    initMap();
    
    // Start first round
    startRound();
}

// Initialize Leaflet map
function initMap() {
    // Create map centered on Michigan
    map = L.map('map', {
        center: [44.3148, -85.6024],
        zoom: 7,
        minZoom: 6,
        maxZoom: 12
    });
    
    // Add Esri World Imagery tiles (satellite view)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    }).addTo(map);
    
    // Restrict panning to Michigan area
    const michiganBounds = L.latLngBounds(
        L.latLng(41.5, -90.5),  // Southwest corner
        L.latLng(48.5, -82.0)   // Northeast corner
    );
    map.setMaxBounds(michiganBounds);
    map.on('drag', function() {
        map.panInsideBounds(michiganBounds, { animate: false });
    });
    
    // Add click listener
    map.on('click', handleMapClick);
}

// Start a new round
function startRound() {
    // Reset state
    hasGuessed = false;
    clearMarkers();
    resultPanel.classList.add('hidden');
    
    // Select random city
    currentCity = filteredCities[Math.floor(Math.random() * filteredCities.length)];
    
    // Update UI
    targetCityName.textContent = currentCity.name;
    roundNumberEl.textContent = roundNumber;
    
    console.log(`Round ${roundNumber}: Find ${currentCity.name}`);
}

// Handle map click
function handleMapClick(e) {
    // Only allow one guess per round
    if (hasGuessed) return;
    
    hasGuessed = true;
    const userLatLng = e.latlng;
    const actualLatLng = L.latLng(currentCity.lat, currentCity.lng);
    
    // Create user marker (red)
    userMarker = L.circleMarker(userLatLng, {
        color: '#c0392b',
        fillColor: '#e74c3c',
        fillOpacity: 0.7,
        radius: 8,
        weight: 2
    }).addTo(map);
    
    userMarker.bindPopup('Your Guess').openPopup();
    
    // Create actual city marker (green)
    actualMarker = L.circleMarker(actualLatLng, {
        color: '#1e8449',
        fillColor: '#27ae60',
        fillOpacity: 0.7,
        radius: 8,
        weight: 2
    }).addTo(map);
    
    actualMarker.bindPopup(`${currentCity.name}<br>Population: ${currentCity.population.toLocaleString()}`);
    
    // Draw dashed line between points
    connectionLine = L.polyline([userLatLng, actualLatLng], {
        color: '#3498db',
        weight: 2,
        dashArray: '10, 10',
        opacity: 0.7
    }).addTo(map);
    
    // Calculate distance in miles
    const distanceMeters = userLatLng.distanceTo(actualLatLng);
    const distanceMiles = (distanceMeters * 0.000621371).toFixed(2);
    
    // Display result
    displayResult(distanceMiles);
    
    // Keep the map at the same zoom level (don't auto-zoom)
    // Users can zoom in manually if they want to see details
}

// Display result
function displayResult(distance) {
    let message = '';
    
    if (distance < 5) {
        message = '🎯 Excellent! Very close!';
    } else if (distance < 15) {
        message = '👍 Great job! Pretty close!';
    } else if (distance < 30) {
        message = '✓ Not bad! Getting warmer!';
    } else if (distance < 50) {
        message = '📍 Keep practicing!';
    } else {
        message = '🗺️ Try again next time!';
    }
    
    resultMessage.textContent = message;
    resultDistance.textContent = `You were ${distance} miles away!`;
    resultPanel.classList.remove('hidden');
}

// Clear markers and lines from map
function clearMarkers() {
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    if (actualMarker) {
        map.removeLayer(actualMarker);
        actualMarker = null;
    }
    if (connectionLine) {
        map.removeLayer(connectionLine);
        connectionLine = null;
    }
}

// Next round
function nextRound() {
    roundNumber++;
    
    // Reset map view
    map.setView([44.3148, -85.6024], 7);
    
    startRound();
}

// Change game mode
function changeMode() {
    // Clear everything
    clearMarkers();
    
    // Remove map
    if (map) {
        map.remove();
        map = null;
    }
    
    // Show mode selection
    gameInterface.classList.add('hidden');
    modeSelection.classList.remove('hidden');
}

// Start the game when page loads
init();
