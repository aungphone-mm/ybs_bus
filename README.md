# YBS Journey Planner 🚌

An interactive web application for planning bus journeys in Yangon using the YBS (Yangon Bus Service) network. Find the best routes between any two stops, visualize bus routes on interactive maps, and explore comprehensive transit data.

## 🌐 Live Demo

**Visit the live application:** [https://aungphone-mm.github.io/ybs_bus/](https://aungphone-mm.github.io/ybs_bus/)

## ✨ Features

### 🗺️ Journey Planner
- **Smart Route Finding**: Find optimal bus routes between any two stops
- **Multi-Transfer Support**: Plan journeys with up to 2 transfers
- **Autocomplete Search**: Search stops in both English and Myanmar language
- **Interactive Maps**: Visualize your journey on Leaflet maps with enhanced visibility
- **Detailed Instructions**: Step-by-step boarding and alighting information
- **Route Comparison**: Compare multiple route options ranked by efficiency

### 🚏 Route Map Viewer
- **Individual Route Visualization**: View any YBS bus route on the map
- **Stop Information**: See all stops along each route
- **Route Search**: Quickly find routes by number
- **Color-Coded Lines**: Each route displayed in its official color
- **Enhanced Visibility**: Thick lines with white outlines for better readability

### 📊 Data Dashboard
- **Route Analytics**: Comprehensive statistics about the YBS network
- **Coverage Analysis**: Township and road distribution data
- **Interactive Visualizations**: Charts and graphs powered by real data
- **Summary Reports**: Detailed network insights

### 🖼️ Gallery
- **Visual Documentation**: Screenshots and examples
- **Usage Demonstrations**: See the application in action

## 🚀 Quick Start

### Online Usage
Simply visit [https://aungphone-mm.github.io/ybs_bus/](https://aungphone-mm.github.io/ybs_bus/) and start planning your journey!

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/aungphone-mm/ybs_bus.git
   cd ybs_bus
   ```

2. **Start a local web server**

   Using Python:
   ```bash
   python -m http.server 8000
   ```

   Or using Node.js:
   ```bash
   npx http-server -p 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📖 How to Use

### Finding a Route

1. **Open Journey Planner**: Navigate to the Journey Planner page
2. **Enter Origin**: Type your starting point (e.g., "Hledan")
3. **Enter Destination**: Type your destination (e.g., "Sule")
4. **Click "Find Routes"**: View all available route options
5. **Select Best Route**: Routes are ranked by transfers, stops, and distance
6. **View on Map**: See the route highlighted on the interactive map

### Viewing Route Maps

1. **Open Route Map**: Navigate to the Route Map page
2. **Browse Routes**: Scroll through the list of available routes
3. **Select a Route**: Click on any route number
4. **Explore**: View the complete route path and all stops

### Example Searches

Try these popular routes:
- **Hledan** to **Sule** (City Center routes)
- **Dagon University** to **Shwedagon** (University to Pagoda)
- **Ahlone** to **Insein** (Cross-town routes)

## 🛠️ Technologies Used

- **HTML5/CSS3**: Modern, responsive web design
- **JavaScript (ES6+)**: Client-side application logic
- **Leaflet.js**: Interactive map visualization
- **OpenStreetMap**: Map tile provider
- **Custom Algorithms**: BFS-based pathfinding with route optimization

## 📊 Data

### Route Coverage
- **100+ Bus Routes**: Complete YBS network data
- **2000+ Bus Stops**: Comprehensive stop database
- **Bilingual Support**: Stop names in English and Myanmar (Burmese)
- **Geographic Data**: Accurate GPS coordinates and route paths

### Data Structure
```
data/
├── stops.tsv              # All bus stops with coordinates
├── routes-index.json      # Route index for quick lookups
└── routes/                # Individual route files
    ├── route1.json
    ├── route2.json
    └── ...
```

## 🏗️ Architecture

### Core Modules

- **`stopMatcher.js`**: Fuzzy search and stop matching
- **`routeIndex.js`**: Inverted index for fast route lookups
- **`pathfinder.js`**: BFS-based multi-transfer pathfinding
- **`autocomplete.js`**: Smart autocomplete for stop search
- **`journeyUI.js`**: Journey result rendering and visualization

### Algorithm

The pathfinding uses a modified Breadth-First Search (BFS) algorithm:
1. Build inverted index: `stopId → routes[]`
2. BFS exploration with route awareness
3. Transfer detection at common stops
4. Path ranking by transfers, stops, and distance
5. Return top N optimized paths

## 🎨 Features Highlights

### Enhanced Map Visibility
- ✅ White outline around bus lines for contrast
- ✅ Thicker route lines (6px) with full opacity
- ✅ Larger stop markers (10-12px radius)
- ✅ Color-coded by route with emoji indicators
- ✅ Interactive popups with stop details

### Smart Search
- ✅ Fuzzy matching for typos
- ✅ Supports both English and Myanmar
- ✅ Real-time autocomplete suggestions
- ✅ Township and road information

### Journey Planning
- ✅ Direct routes prioritized
- ✅ Up to 2 transfers supported
- ✅ Distance and stop count optimization
- ✅ Transfer point identification
- ✅ Expandable stop lists

## 📱 Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug? [Open an issue](https://github.com/aungphone-mm/ybs_bus/issues)
2. **Suggest Features**: Have an idea? Share it in the issues
3. **Update Data**: Notice incorrect route information? Submit corrections
4. **Improve Code**: Fork, improve, and submit a pull request

### Development Guidelines

```bash
# Fork and clone the repo
git clone https://github.com/YOUR-USERNAME/ybs_bus.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push and create PR
git push origin feature/your-feature-name
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **YBS (Yangon Bus Service)**: For providing public transportation in Yangon
- **YRTA (Yangon Regional Transport Authority)**: Transit data source
- **OpenStreetMap Contributors**: Map data and tiles
- **Leaflet.js**: Excellent mapping library

## 📞 Contact

- **GitHub**: [@aungphone-mm](https://github.com/aungphone-mm)
- **Repository**: [ybs_bus](https://github.com/aungphone-mm/ybs_bus)

## 🗺️ Roadmap

Future improvements planned:
- [ ] Real-time bus tracking integration
- [ ] Fare calculation
- [ ] Save favorite routes
- [ ] Share journey links
- [ ] Mobile app version
- [ ] Offline support
- [ ] Multi-language interface
- [ ] Accessibility improvements

---

**Made with ❤️ for Yangon commuters**

🤖 *Developed with assistance from [Claude Code](https://claude.com/claude-code)*
