let map;
let currentTarget;
let gameData = [];
let countyGameData = [];
let parksGameData = [];
let districtsGameData = [];
let filteredTargets = [];
let currentMode = '';
let citiesPoolSize = 25;
let streak = 0;
let highScore = 0;
let lastGuessSuccessful = false;
let userMarker = null;
let actualMarker = null;
let connectionLine = null;
let highlightedPolygon = null;
let hasGuessed = false;
let countiesLayer = null;
let countiesVisible = false;
let countiesData = null;
let districtsLayer = null;

// Mode configuration
const MODE_CONFIG = {
    'cities': {
        dataSource: 'gameData',
        label: 'Cities',
        resultLabel: 'City:',
        nextBtnText: 'Next City',
        showPopulation: true,
        showDateFounded: false,
        wikiSuffix: ',_Michigan',
        hasPoolSize: true,
        successThreshold: 5 // miles
    },
    'county-seats': {
        dataSource: 'gameData',
        label: 'County Seats',
        resultLabel: 'City:',
        nextBtnText: 'Next City',
        showPopulation: true,
        showDateFounded: false,
        wikiSuffix: ',_Michigan',
        hasPoolSize: false,
        successThreshold: 5 // miles
    },
    'counties': {
        dataSource: 'countyGameData',
        label: 'Counties',
        resultLabel: 'County:',
        nextBtnText: 'Next County',
        showPopulation: false,
        showDateFounded: false,
        wikiSuffix: '_County,_Michigan',
        hasPoolSize: false,
        isPolygon: true
    },
    'state-parks': {
        dataSource: 'parksGameData',
        label: 'State Parks',
        resultLabel: 'Park:',
        nextBtnText: 'Next Park',
        showPopulation: false,
        showDateFounded: true,
        wikiSuffix: '_(Michigan)',
        hasPoolSize: false,
        successThreshold: 5 // miles
    },
    'congress-districts': {
        dataSource: 'districtsGameData',
        label: 'Congressional Districts',
        resultLabel: 'District:',
        nextBtnText: 'Next District',
        showPopulation: false,
        showDateFounded: false,
        wikiSuffix: '',
        hasPoolSize: false,
        isPolygon: true
    }
};

// DOM elements
const resultLabel = document.getElementById('result-label');
const resultName = document.getElementById('result-name');
const resultPopulation = document.getElementById('result-population');
const populationContainer = document.getElementById('population-container');
const resultFact = document.getElementById('result-fact');
const resultWikiLink = document.getElementById('result-wiki-link');
const btnRetry = document.getElementById('btn-retry');
const nextBtn = document.getElementById('btn-next');
const modeSelection = document.getElementById('mode-selection');
const gameInterface = document.getElementById('game-interface');
const citiesBtn = document.getElementById('cities-btn');
const countySeatBtn = document.getElementById('county-seats-btn');
const countiesBtn = document.getElementById('counties-btn');
const targetCityName = document.getElementById('target-city-name');
const resultPanel = document.getElementById('result-panel');
const resultMessage = document.getElementById('result-message');
const resultDistance = document.getElementById('result-distance');
const changeModeBtn = document.getElementById('change-mode-btn');
const streakNumberEl = document.getElementById('streak-number');
const highScoreEl = document.getElementById('high-score');
const gameModeEl = document.getElementById('game-mode');
const citiesPoolDropdown = document.getElementById('cities-pool-dropdown');
const MAP_CENTER = [44.5, -85.5];

// Initialize the game
async function init() {
    // Load game data
    await loadGameData();
    await loadCountyData();
    await loadParksData();
    await loadDistrictsData();

    // Initialize map immediately so it shows under the mode selection overlay
    initMap();

    // Load saved preferences from localStorage
    loadPreferences();

    // If counties were visible in last session, show them now that everything is loaded
    if (countiesVisible) {
        await toggleCounties();
    }

    // Set up event listeners
    citiesBtn.addEventListener('click', () => startGame('cities'));
    countySeatBtn.addEventListener('click', () => startGame('county-seats'));
    countiesBtn.addEventListener('click', () => startGame('counties'));
    document.getElementById('state-parks-btn').addEventListener('click', () => startGame('state-parks'));
    document.getElementById('congress-districts-btn').addEventListener('click', () => startGame('congress-districts'));
    nextBtn.addEventListener('click', nextRound);
    btnRetry.addEventListener('click', retryTarget);
    changeModeBtn.addEventListener('click', changeMode);
    document.getElementById('toggle-counties-btn').addEventListener('click', toggleCounties);
    citiesPoolDropdown.addEventListener('change', handlePoolSizeChange);
}

// Load saved preferences from localStorage
function loadPreferences() {
    // Load county visibility preference
    const savedCountiesVisible = localStorage.getItem('countiesVisible') === 'true';
    if (savedCountiesVisible) {
        countiesVisible = savedCountiesVisible;
        // Update button text to match saved state
        const toggleBtn = document.getElementById('toggle-counties-btn');
        toggleBtn.textContent = 'Hide Counties';
    }

    // Load cities pool size preference
    const savedPoolSize = localStorage.getItem('citiesPoolSize');
    if (savedPoolSize) {
        citiesPoolSize = parseInt(savedPoolSize);
        citiesPoolDropdown.value = savedPoolSize;
    }

    // Load high score
    const savedHighScore = localStorage.getItem('highScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        highScoreEl.textContent = highScore;
    }

    // Load last mode (optional - just for reference, not auto-starting)
    const lastMode = localStorage.getItem('lastMode');
    if (lastMode) {
        console.log(`Last played mode: ${lastMode}`);
    }
}

// Handle pool size dropdown change
function handlePoolSizeChange(e) {
    const newSize = parseInt(e.target.value);
    citiesPoolSize = newSize;

    // Save to localStorage
    localStorage.setItem('citiesPoolSize', newSize);

    // If currently in cities mode, restart with new pool
    if (currentMode === 'cities') {
        streak = 0;
        updateStreakDisplay();
        filterCitiesByPoolSize();
        startRound();
    }
}

// Filter cities based on current pool size setting
function filterCitiesByPoolSize() {
    if (citiesPoolSize === -1) {
        // "All" - use all cities
        filteredTargets = [...gameData];
    } else {
        // Top N cities by population
        filteredTargets = [...gameData]
            .sort((a, b) => b.population - a.population)
            .slice(0, citiesPoolSize);
    }
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

// Load and parse county data
async function loadCountyData() {
    const result = await loadGeoJSONData('Counties.geojson', 'Name', 'county');
    countyGameData = result.data;
    countiesData = result.rawGeoJSON;
}

// Generic GeoJSON loader for both point and polygon features
async function loadGeoJSONData(filename, nameProperty, typeLabel) {
    try {
        const response = await fetch(filename);
        const geoJsonData = await response.json();

        const parsedData = geoJsonData.features.map(feature => {
            const props = feature.properties;
            const name = props[nameProperty] || props.name || props.Name || `Unknown ${typeLabel}`;

            let lat, lng, geometry;

            // Handle point features
            if (feature.geometry.type === 'Point') {
                [lng, lat] = feature.geometry.coordinates;
                geometry = null;
            }
            // Handle polygon features
            else {
                const layer = L.geoJSON(feature);
                const bounds = layer.getBounds();
                const center = bounds.getCenter();
                lat = center.lat;
                lng = center.lng;
                geometry = feature.geometry;
            }

            return {
                name: name,
                lat: lat,
                lng: lng,
                type: typeLabel,
                geometry: geometry,
                funFact: props.funFact || props.fun_fact || props.description,
                dateFounded: props.dateFounded || props.date_founded || props.established,
                population: props.population,
                ...props // Include all other properties
            };
        });

        console.log(`Loaded ${parsedData.length} ${typeLabel}s`);

        // Return both parsed data and raw GeoJSON to avoid double-fetching
        return {
            data: parsedData,
            rawGeoJSON: geoJsonData
        };

    } catch (error) {
        console.error(`Error loading ${typeLabel} data:`, error);
        return {
            data: [],
            rawGeoJSON: null
        };
    }
}

// Load state parks data
async function loadParksData() {
    const result = await loadGeoJSONData('michigan_parks.geojson', 'name', 'park');
    parksGameData = result.data;
}

// Load congressional districts data
async function loadDistrictsData() {
    const result = await loadGeoJSONData('Michigan_US_Congressional_Districts.geojson', 'Name', 'District');
    districtsGameData = result.data;
    window.districtsGeoJSON = result.rawGeoJSON;
}

// Start game with selected mode
function startGame(mode) {
    currentMode = mode;
    streak = 0;
    updateStreakDisplay();

    const config = MODE_CONFIG[mode];
    if (!config) {
        console.error(`Unknown mode: ${mode}`);
        return;
    }

    // Save mode to localStorage
    localStorage.setItem('lastMode', mode);

    // Get data source
    const dataSourceName = config.dataSource;
    let sourceData = window[dataSourceName] || eval(dataSourceName);

    // Filter targets based on mode
    if (mode === 'cities') {
        filterCitiesByPoolSize();
    } else if (mode === 'county-seats') {
        filteredTargets = sourceData.filter(city => city.isCountySeat === true);
    } else {
        filteredTargets = [...sourceData];
    }

    // Show/hide pool size dropdown based on config
    citiesPoolDropdown.style.display = config.hasPoolSize ? 'inline-block' : 'none';

    gameModeEl.textContent = config.label;

    // Show/hide district polygons based on mode
    if (mode === 'congress-districts') {
        showDistrictPolygons();
    } else {
        hideDistrictPolygons();
    }

    console.log(`Starting ${mode} mode with ${filteredTargets.length} targets`);

    // Hide mode selection overlay with smooth fade
    modeSelection.classList.add('hidden');

    // Start first round
    startRound();
}

// Initialize Leaflet map
function initMap() {
    map = L.map('map', {
        center: MAP_CENTER,
        zoom: 7,
        minZoom: 6,
        maxZoom: 12
    });

    // Add Esri World Imagery tiles (satellite view)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    }).addTo(map);

    // Add click listener
    map.on('click', handleMapClick);
}

// Start a new round
function startRound() {
    // Reset state
    hasGuessed = false;
    clearMarkers();
    resultPanel.classList.add('hidden');

    // Select random target
    currentTarget = filteredTargets[Math.floor(Math.random() * filteredTargets.length)];

    // Update UI
    targetCityName.textContent = currentTarget.name;

    console.log(`Streak ${streak}: Find ${currentTarget.name}`);
}

// Update streak display
function updateStreakDisplay() {
    streakNumberEl.textContent = streak;

    // Update high score if current streak is higher
    if (streak > highScore) {
        highScore = streak;
        highScoreEl.textContent = highScore;
        localStorage.setItem('highScore', highScore);
        console.log(`New high score: ${highScore}!`);
    }
}

// Handle map click
function handleMapClick(e) {
    // Only allow one guess per round
    if (hasGuessed) return;

    hasGuessed = true;
    const userLatLng = e.latlng;
    const actualLatLng = L.latLng(currentTarget.lat, currentTarget.lng);

    // Create user marker (red)
    userMarker = L.circleMarker(userLatLng, {
        color: '#c0392b',
        fillColor: '#e74c3c',
        fillOpacity: 0.7,
        radius: 8,
        weight: 2
    }).addTo(map);

    // Create actual location marker (green)
    actualMarker = L.circleMarker(actualLatLng, {
        color: '#1e8449',
        fillColor: '#27ae60',
        fillOpacity: 0.7,
        radius: 8,
        weight: 2
    }).addTo(map);

    // If in polygon mode (counties or districts), highlight the actual polygon
    const config = MODE_CONFIG[currentMode];
    if (config && config.isPolygon && currentTarget.geometry) {
        highlightedPolygon = L.geoJSON(currentTarget.geometry, {
            style: {
                color: '#27ae60',
                weight: 3,
                opacity: 0.8,
                fillColor: '#27ae60',
                fillOpacity: 0.2
            }
        }).addTo(map);
    }

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
    displayResult(distanceMiles, userLatLng);
}

function displayResult(distance, userLatLng) {
    let message = '';
    const config = MODE_CONFIG[currentMode];

    // Determine if the guess was successful
    if (config.isPolygon) {
        // For polygons, check if click is inside the polygon
        const clickPoint = [userLatLng.lng, userLatLng.lat];
        lastGuessSuccessful = isPointInPolygon(clickPoint, currentTarget.geometry);
    } else {
        // For point locations, check distance threshold
        lastGuessSuccessful = distance < config.successThreshold;
    }

    // 1. Determine the message based on success and distance
    if (lastGuessSuccessful) {
        if (config.isPolygon) {
            message = '🎯 Perfect! You clicked inside!';
        } else if (distance < 5) {
            message = '🎯 Excellent! Very close!';
        }
    } else {
        if (distance < 15) {
            message = '👍 Great job! Pretty close!';
        } else if (distance < 30) {
            message = '✓ Not bad! Getting warmer!';
        } else if (distance < 50) {
            message = '🔍 Keep practicing!';
        } else {
            message = '🗺️ Try again next time!';
        }
    }

    // 2. Update the simple text fields
    resultMessage.textContent = message;
    if (config.isPolygon) {
        if (lastGuessSuccessful) {
            resultDistance.textContent = `You clicked inside the correct ${config.resultLabel.replace(':', '').toLowerCase()}!`;
        } else {
            resultDistance.textContent = `You were ${distance} miles from the center.`;
        }
    } else {
        resultDistance.textContent = `You were ${distance} miles away!`;
    }

    // For congressional districts, show the District property instead of name
    if (currentMode === 'congress-districts' && currentTarget.District) {
        resultName.textContent = currentTarget.District;
    } else {
        resultName.textContent = currentTarget.name;
    }

    resultFact.textContent = currentTarget.funFact ? `${currentTarget.funFact}` : '';

    // Handle images for all modes
    const cityImageContainer = document.getElementById('city-image-container');
    const cityImage = document.getElementById('city-image');

    // Convert name to filename format (spaces to underscores)
    const imageFileName = currentTarget.name.replace(/ /g, '_') + '.webp';
    const imagePath = `images/${imageFileName}`;

    // Try to load the image
    cityImage.src = imagePath;
    cityImage.alt = currentTarget.name;

    // Show container (will hide via onerror if image doesn't exist)
    cityImageContainer.style.display = 'block';

    // Hide if image fails to load
    cityImage.onerror = () => {
        cityImageContainer.style.display = 'none';
    };

    // Ensure it's visible if image loads successfully
    cityImage.onload = () => {
        cityImageContainer.style.display = 'block';
    };

    // 3. Use MODE_CONFIG for display customization
    resultLabel.textContent = config.resultLabel;
    nextBtn.textContent = config.nextBtnText;

    // Show/hide population
    populationContainer.style.display = config.showPopulation ? 'block' : 'none';
    if (config.showPopulation && currentTarget.population) {
        resultPopulation.textContent = currentTarget.population.toLocaleString();
    }

    // Show/hide date founded
    const dateFoundedContainer = document.getElementById('date-founded-container');
    if (dateFoundedContainer) {
        dateFoundedContainer.style.display = config.showDateFounded ? 'block' : 'none';
        if (config.showDateFounded && currentTarget.dateFounded) {
            document.getElementById('result-date-founded').textContent = currentTarget.dateFounded;
        }
    }

    // Set Wikipedia link
    if (config.wikiSuffix) {
        resultWikiLink.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(currentTarget.name)}${config.wikiSuffix}`;
    } else {
        resultWikiLink.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(currentTarget.name)}`;
    }

    // 4. Finally, show the panel
    resultPanel.classList.remove('hidden');
}

// Check if a point is inside a polygon (using ray casting algorithm)
function isPointInPolygon(point, geometry) {
    // Handle MultiPolygon geometry
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some(polygon =>
            checkPointInPolygonCoordinates(point, polygon)
        );
    }
    // Handle regular Polygon geometry
    else if (geometry.type === 'Polygon') {
        return checkPointInPolygonCoordinates(point, geometry.coordinates);
    }
    return false;
}

function checkPointInPolygonCoordinates(point, coordinates) {
    // coordinates[0] is the outer ring
    const ring = coordinates[0];
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

function retryTarget() {
    hasGuessed = false;
    clearMarkers();
    resultPanel.classList.add('hidden');
    console.log(`Retrying: ${currentTarget.name}`);
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
    if (highlightedPolygon) {
        map.removeLayer(highlightedPolygon);
        highlightedPolygon = null;
    }
}

// Next round
function nextRound() {
    // Update streak based on last guess
    if (lastGuessSuccessful) {
        streak++;
        updateStreakDisplay();
    } else {
        streak = 0;
        updateStreakDisplay();
    }

    // Reset map view to original center position
    map.setView(MAP_CENTER, 7, { animate: true });
    startRound();
}

// Change game mode
function changeMode() {
    // Clear everything
    clearMarkers();

    // Reset map view
    map.setView(MAP_CENTER, 7);

    // Show mode selection overlay again
    modeSelection.classList.remove('hidden');
}

async function toggleCounties() {
    const toggleBtn = document.getElementById('toggle-counties-btn');

    // If data not loaded yet, load it first
    if (!countiesData) {
        try {
            const response = await fetch('Counties.geojson');
            countiesData = await response.json();
            console.log('Counties data loaded');
        } catch (error) {
            console.error('Error loading counties:', error);
            alert('Could not load county boundaries');
            return;
        }
    }

    // Now toggle based on current state
    if (countiesVisible) {
        // Hide counties
        if (countiesLayer) {
            map.removeLayer(countiesLayer);
        }
        countiesVisible = false;
        toggleBtn.textContent = 'Show Counties';
    } else {
        // Show counties
        countiesLayer = L.geoJSON(countiesData, {
            style: {
                color: '#ffffff',
                weight: 2,
                opacity: 0.6,
                fillOpacity: 0
            }
        }).addTo(map);
        countiesVisible = true;
        toggleBtn.textContent = 'Hide Counties';
    }

    // Save preference to localStorage
    localStorage.setItem('countiesVisible', countiesVisible);
}

// Show congressional district polygons (forced on during congress-districts mode)
function showDistrictPolygons() {
    if (districtsLayer) {
        return; // Already showing
    }

    if (window.districtsGeoJSON) {
        districtsLayer = L.geoJSON(window.districtsGeoJSON, {
            style: {
                color: '#3498db',
                weight: 2,
                opacity: 0.7,
                fillOpacity: 0
            }
        }).addTo(map);
        console.log('District polygons shown');
    }
}

// Hide congressional district polygons
function hideDistrictPolygons() {
    if (districtsLayer) {
        map.removeLayer(districtsLayer);
        districtsLayer = null;
        console.log('District polygons hidden');
    }
}

// Start the game when page loads
init();
