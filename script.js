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
let filterDetroit = false; // NEW

// Detroit city center coordinates
const DETROIT_CENTER = L.latLng(42.3314, -83.0458); // NEW
const DETROIT_FILTER_RADIUS_MILES = 30; // NEW

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
        successThreshold: 5
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
        successThreshold: 5
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
        successThreshold: 5
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
const filterDetroitBtn = document.getElementById('filter-detroit-btn'); // NEW
const MAP_CENTER = [44.5, -85.5];

// Initialize the game
async function init() {
    await loadGameData();
    await loadCountyData();
    await loadParksData();
    await loadDistrictsData();

    initMap();
    loadPreferences();

    if (countiesVisible) {
        await toggleCounties();
    }

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

    // NEW: Detroit filter toggle
    filterDetroitBtn.addEventListener('click', toggleDetroitFilter);
}

// NEW: Toggle the Detroit suburb filter
function toggleDetroitFilter() {
    filterDetroit = !filterDetroit;
    filterDetroitBtn.textContent = filterDetroit ? 'Show Detroit Suburbs' : 'Filter Detroit Suburbs';
    filterDetroitBtn.style.background = filterDetroit ? '#e8f0fe' : '';
    filterDetroitBtn.style.borderColor = filterDetroit ? '#1a73e8' : '';
    filterDetroitBtn.style.color = filterDetroit ? '#1a73e8' : '';

    localStorage.setItem('filterDetroit', filterDetroit);

    // Re-filter and restart round if in cities mode
    if (currentMode === 'cities') {
        streak = 0;
        updateStreakDisplay();
        filterCitiesByPoolSize();
        startRound();
    }
}

// NEW: Check if a city is within the Detroit filter radius
function isTooCloseToDetroit(city) {
    const cityLatLng = L.latLng(city.lat, city.lng);
    const distanceMeters = cityLatLng.distanceTo(DETROIT_CENTER);
    const distanceMiles = distanceMeters * 0.000621371;
    return distanceMiles <= DETROIT_FILTER_RADIUS_MILES;
}

// Load saved preferences from localStorage
function loadPreferences() {
    const savedCountiesVisible = localStorage.getItem('countiesVisible') === 'true';
    if (savedCountiesVisible) {
        countiesVisible = savedCountiesVisible;
        document.getElementById('toggle-counties-btn').textContent = 'Hide Counties';
    }

    const savedPoolSize = localStorage.getItem('citiesPoolSize');
    if (savedPoolSize) {
        citiesPoolSize = parseInt(savedPoolSize);
        citiesPoolDropdown.value = savedPoolSize;
    }

    const savedHighScore = localStorage.getItem('highScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        highScoreEl.textContent = highScore;
    }

    // NEW: Load Detroit filter preference
    filterDetroit = localStorage.getItem('filterDetroit') === 'true';
    if (filterDetroit) {
        filterDetroitBtn.textContent = 'Show Detroit Suburbs';
        filterDetroitBtn.style.background = '#e8f0fe';
        filterDetroitBtn.style.borderColor = '#1a73e8';
        filterDetroitBtn.style.color = '#1a73e8';
    }

    const lastMode = localStorage.getItem('lastMode');
    if (lastMode) console.log(`Last played mode: ${lastMode}`);
}

function handlePoolSizeChange(e) {
    const newSize = parseInt(e.target.value);
    citiesPoolSize = newSize;
    localStorage.setItem('citiesPoolSize', newSize);

    if (currentMode === 'cities') {
        streak = 0;
        updateStreakDisplay();
        filterCitiesByPoolSize();
        startRound();
    }
}

function filterCitiesByPoolSize() {
    let pool;
    if (citiesPoolSize === -1) {
        pool = [...gameData];
    } else {
        pool = [...gameData]
            .sort((a, b) => b.population - a.population)
            .slice(0, citiesPoolSize);
    }

    // NEW: Apply Detroit suburb filter if enabled
    if (filterDetroit) {
        pool = pool.filter(city => !isTooCloseToDetroit(city));
    }

    filteredTargets = pool;
}

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

async function loadCountyData() {
    const result = await loadGeoJSONData('Counties.geojson', 'Name', 'county');
    countyGameData = result.data;
    countiesData = result.rawGeoJSON;
}

async function loadGeoJSONData(filename, nameProperty, typeLabel) {
    try {
        const response = await fetch(filename);
        const geoJsonData = await response.json();

        const parsedData = geoJsonData.features.map(feature => {
            const props = feature.properties;
            const name = props[nameProperty] || props.name || props.Name || `Unknown ${typeLabel}`;

            let lat, lng, geometry;

            if (feature.geometry.type === 'Point') {
                [lng, lat] = feature.geometry.coordinates;
                geometry = null;
            } else {
                const layer = L.geoJSON(feature);
                const bounds = layer.getBounds();
                const center = bounds.getCenter();
                lat = center.lat;
                lng = center.lng;
                geometry = feature.geometry;
            }

            return {
                name,
                lat,
                lng,
                type: typeLabel,
                geometry,
                funFact: props.funFact || props.fun_fact || props.description,
                dateFounded: props.dateFounded || props.date_founded || props.established,
                population: props.population,
                ...props
            };
        });

        console.log(`Loaded ${parsedData.length} ${typeLabel}s`);
        return { data: parsedData, rawGeoJSON: geoJsonData };

    } catch (error) {
        console.error(`Error loading ${typeLabel} data:`, error);
        return { data: [], rawGeoJSON: null };
    }
}

async function loadParksData() {
    const result = await loadGeoJSONData('michigan_parks.geojson', 'name', 'park');
    parksGameData = result.data;
}

async function loadDistrictsData() {
    const result = await loadGeoJSONData('Michigan_US_Congressional_Districts.geojson', 'Name', 'District');
    districtsGameData = result.data;
    window.districtsGeoJSON = result.rawGeoJSON;
}

function startGame(mode) {
    currentMode = mode;
    streak = 0;
    updateStreakDisplay();

    const config = MODE_CONFIG[mode];
    if (!config) { console.error(`Unknown mode: ${mode}`); return; }

    localStorage.setItem('lastMode', mode);

    const dataSourceName = config.dataSource;
    let sourceData = window[dataSourceName] || eval(dataSourceName);

    if (mode === 'cities') {
        filterCitiesByPoolSize();
    } else if (mode === 'county-seats') {
        filteredTargets = sourceData.filter(city => city.isCountySeat === true);
    } else {
        filteredTargets = [...sourceData];
    }

    citiesPoolDropdown.style.display = config.hasPoolSize ? 'inline-block' : 'none';

    // NEW: Show/hide Detroit filter button — only in cities mode
    filterDetroitBtn.style.display = mode === 'cities' ? 'inline-block' : 'none';

    gameModeEl.textContent = config.label;

    if (mode === 'congress-districts') {
        showDistrictPolygons();
    } else {
        hideDistrictPolygons();
    }

    console.log(`Starting ${mode} mode with ${filteredTargets.length} targets`);
    modeSelection.classList.add('hidden');
    startRound();
}

function initMap() {
    map = L.map('map', {
        center: MAP_CENTER,
        zoom: 7,
        minZoom: 6,
        maxZoom: 12
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    }).addTo(map);

    map.on('click', handleMapClick);
}

function startRound() {
    hasGuessed = false;
    clearMarkers();
    resultPanel.classList.add('hidden');
    currentTarget = filteredTargets[Math.floor(Math.random() * filteredTargets.length)];
    targetCityName.textContent = currentTarget.name;
    console.log(`Streak ${streak}: Find ${currentTarget.name}`);
}

function updateStreakDisplay() {
    streakNumberEl.textContent = streak;
    if (streak > highScore) {
        highScore = streak;
        highScoreEl.textContent = highScore;
        localStorage.setItem('highScore', highScore);
        console.log(`New high score: ${highScore}!`);
    }
}

function handleMapClick(e) {
    if (hasGuessed) return;
    hasGuessed = true;

    const userLatLng = e.latlng;
    const actualLatLng = L.latLng(currentTarget.lat, currentTarget.lng);

    userMarker = L.circleMarker(userLatLng, {
        color: '#c0392b', fillColor: '#e74c3c', fillOpacity: 0.7, radius: 8, weight: 2
    }).addTo(map);

    actualMarker = L.circleMarker(actualLatLng, {
        color: '#1e8449', fillColor: '#27ae60', fillOpacity: 0.7, radius: 8, weight: 2
    }).addTo(map);

    const config = MODE_CONFIG[currentMode];
    if (config && config.isPolygon && currentTarget.geometry) {
        highlightedPolygon = L.geoJSON(currentTarget.geometry, {
            style: { color: '#27ae60', weight: 3, opacity: 0.8, fillColor: '#27ae60', fillOpacity: 0.2 }
        }).addTo(map);
    }

    connectionLine = L.polyline([userLatLng, actualLatLng], {
        color: '#3498db', weight: 2, dashArray: '10, 10', opacity: 0.7
    }).addTo(map);

    const distanceMeters = userLatLng.distanceTo(actualLatLng);
    const distanceMiles = (distanceMeters * 0.000621371).toFixed(2);

    displayResult(distanceMiles, userLatLng);
}

function displayResult(distance, userLatLng) {
    let message = '';
    const config = MODE_CONFIG[currentMode];

    if (config.isPolygon) {
        const clickPoint = [userLatLng.lng, userLatLng.lat];
        lastGuessSuccessful = isPointInPolygon(clickPoint, currentTarget.geometry);
    } else {
        lastGuessSuccessful = distance < config.successThreshold;
    }

    if (lastGuessSuccessful) {
        message = config.isPolygon ? '🎯 Perfect! You clicked inside!' : '🎯 Excellent! Very close!';
    } else {
        if (distance < 15) message = '👍 Great job! Pretty close!';
        else if (distance < 30) message = '✓ Not bad! Getting warmer!';
        else if (distance < 50) message = '🔍 Keep practicing!';
        else message = '🗺️ Try again next time!';
    }

    resultMessage.textContent = message;

    if (config.isPolygon) {
        resultDistance.textContent = lastGuessSuccessful
            ? `You clicked inside the correct ${config.resultLabel.replace(':', '').toLowerCase()}!`
            : `You were ${distance} miles from the center.`;
    } else {
        resultDistance.textContent = `You were ${distance} miles away!`;
    }

    if (currentMode === 'congress-districts' && currentTarget.District) {
        resultName.textContent = currentTarget.District;
    } else {
        resultName.textContent = currentTarget.name;
    }

    resultFact.textContent = currentTarget.funFact ? `${currentTarget.funFact}` : '';

    const cityImageContainer = document.getElementById('city-image-container');
    const cityImage = document.getElementById('city-image');
    const imageFileName = currentTarget.name.replace(/ /g, '_') + '.webp';
    cityImage.src = `images/${imageFileName}`;
    cityImage.alt = currentTarget.name;
    cityImageContainer.style.display = 'block';
    cityImage.onerror = () => { cityImageContainer.style.display = 'none'; };
    cityImage.onload = () => { cityImageContainer.style.display = 'block'; };

    resultLabel.textContent = config.resultLabel;
    nextBtn.textContent = config.nextBtnText;

    populationContainer.style.display = config.showPopulation ? 'block' : 'none';
    if (config.showPopulation && currentTarget.population) {
        resultPopulation.textContent = currentTarget.population.toLocaleString();
    }

    const dateFoundedContainer = document.getElementById('date-founded-container');
    if (dateFoundedContainer) {
        dateFoundedContainer.style.display = config.showDateFounded ? 'block' : 'none';
        if (config.showDateFounded && currentTarget.dateFounded) {
            document.getElementById('result-date-founded').textContent = currentTarget.dateFounded;
        }
    }

    if (config.wikiSuffix) {
        resultWikiLink.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(currentTarget.name)}${config.wikiSuffix}`;
    } else {
        resultWikiLink.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(currentTarget.name)}`;
    }

    resultPanel.classList.remove('hidden');
}

function isPointInPolygon(point, geometry) {
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some(polygon => checkPointInPolygonCoordinates(point, polygon));
    } else if (geometry.type === 'Polygon') {
        return checkPointInPolygonCoordinates(point, geometry.coordinates);
    }
    return false;
}

function checkPointInPolygonCoordinates(point, coordinates) {
    const ring = coordinates[0];
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function retryTarget() {
    hasGuessed = false;
    clearMarkers();
    resultPanel.classList.add('hidden');
}

function clearMarkers() {
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (actualMarker) { map.removeLayer(actualMarker); actualMarker = null; }
    if (connectionLine) { map.removeLayer(connectionLine); connectionLine = null; }
    if (highlightedPolygon) { map.removeLayer(highlightedPolygon); highlightedPolygon = null; }
}

function nextRound() {
    if (lastGuessSuccessful) { streak++; } else { streak = 0; }
    updateStreakDisplay();
    map.setView(MAP_CENTER, 7, { animate: true });
    startRound();
}

function changeMode() {
    clearMarkers();
    map.setView(MAP_CENTER, 7);
    modeSelection.classList.remove('hidden');
}

async function toggleCounties() {
    const toggleBtn = document.getElementById('toggle-counties-btn');

    if (!countiesData) {
        try {
            const response = await fetch('Counties.geojson');
            countiesData = await response.json();
        } catch (error) {
            console.error('Error loading counties:', error);
            alert('Could not load county boundaries');
            return;
        }
    }

    if (countiesVisible) {
        if (countiesLayer) map.removeLayer(countiesLayer);
        countiesVisible = false;
        toggleBtn.textContent = 'Show Counties';
    } else {
        countiesLayer = L.geoJSON(countiesData, {
            style: { color: '#ffffff', weight: 2, opacity: 0.6, fillOpacity: 0 }
        }).addTo(map);
        countiesVisible = true;
        toggleBtn.textContent = 'Hide Counties';
    }

    localStorage.setItem('countiesVisible', countiesVisible);
}

function showDistrictPolygons() {
    if (districtsLayer) return;
    if (window.districtsGeoJSON) {
        districtsLayer = L.geoJSON(window.districtsGeoJSON, {
            style: { color: '#3498db', weight: 2, opacity: 0.7, fillOpacity: 0 }
        }).addTo(map);
    }
}

function hideDistrictPolygons() {
    if (districtsLayer) {
        map.removeLayer(districtsLayer);
        districtsLayer = null;
    }
}

init();
