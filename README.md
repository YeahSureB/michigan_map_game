# Michigan Geography Quiz

A fun, interactive web game to test your knowledge of Michigan cities using Leaflet.js maps.

## Files Included

- **index.html** - Main HTML structure
- **styles.css** - Styling and responsive design
- **script.js** - Game logic and Leaflet.js integration
- **michigan_game_data.json** - Sample city data (45 cities)

## How to Run

1. Place all four files in the same directory
2. Open `index.html` in a web browser (Chrome, Firefox, Safari, Edge)
3. No server required - runs directly in the browser!

## Game Features

### Two Game Modes

1. **Major Cities (Top 20)** - Test your knowledge of Michigan's largest cities by population
2. **County Seats** - Challenge yourself to locate Michigan's county seat cities

### Gameplay

1. Select your game mode from the start screen
2. Read the name of the target city at the top of the screen
3. Click on the map where you think the city is located
4. The game will:
   - Show your guess with a red marker
   - Show the actual location with a green marker
   - Draw a dashed line between the two points
   - Calculate and display the distance in miles
   - Give you feedback based on accuracy
5. Click "Next City" to continue to the next round
6. Click "Change Mode" to return to the mode selection screen

### Scoring Guide

- 🎯 **< 5 miles**: Excellent! Very close!
- 👍 **< 15 miles**: Great job! Pretty close!
- ✓ **< 30 miles**: Not bad! Getting warmer!
- 📍 **< 50 miles**: Keep practicing!
- 🗺️ **50+ miles**: Try again next time!

## Technical Details

### Libraries Used

- **Leaflet.js 1.9.4** (via CDN) - Interactive map library
- **CartoDB Positron No Labels** - Map tiles without city labels to prevent cheating

### Map Configuration

- **Center**: 44.3148°N, 85.6024°W (center of Michigan)
- **Initial Zoom**: Level 7
- **Zoom Range**: 6-12 (prevents zooming out too far or in too close)
- **Tiles**: Esri World Imagery (satellite view) - no labels to ensure fair gameplay
- **Bounds Restriction**: Map is locked to Michigan area to prevent unnecessary panning

### Data Schema

Each city in `michigan_game_data.json` follows this structure:

```json
{
  "name": "City Name",
  "lat": 42.1234,
  "lng": -84.5678,
  "population": 50000,
  "isCountySeat": true
}
```

## Customization

### Adding Your Own Cities

Edit `michigan_game_data.json` and add cities following the schema above. The game will automatically:
- Filter the top 20 by population for "Major Cities" mode
- Filter all cities where `isCountySeat: true` for "County Seats" mode

### Changing Map Appearance

In `script.js`, you can change the tile provider by modifying the `L.tileLayer()` call. Some alternatives:

**Satellite Views:**
- **Esri World Imagery** (current): `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- **USGS Imagery**: `https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}`

**Terrain Views:**
- **OpenTopoMap**: `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`
- **Stamen Terrain**: `https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg`

**Minimalist (No Labels):**
- **CartoDB Positron**: `https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png`
- **CartoDB Dark**: `https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png`

Note: Remember to update the attribution text when changing tile providers.

### Styling

Modify `styles.css` to change colors, fonts, button styles, and layout.

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Troubleshooting

**Map not loading?**
- Check browser console for errors
- Ensure you have an internet connection (required for map tiles)
- Verify all files are in the same directory

**Cities not appearing?**
- Check that `michigan_game_data.json` is in the same directory
- Open browser console to see any error messages
- Verify JSON file is properly formatted

**Distance calculation seems off?**
- Leaflet's `distanceTo()` method calculates straight-line distance (as the crow flies)
- This is intentional for game simplicity

## Future Enhancement Ideas

- Add a scoring system that accumulates across rounds
- Implement a timer for each guess
- Create a leaderboard with localStorage
- Add difficulty levels with different accuracy requirements
- Include photos or facts about each city
- Add sound effects for correct/incorrect guesses

## License

Free to use and modify for educational purposes.

---

Enjoy testing your Michigan geography knowledge! 🗺️
