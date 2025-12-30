# TerraView
A clear, immersive view of the Earth — from globe to country-level insights.

## Overview
TerraView is an interactive web application that allows users to explore the world through a 3D globe interface. Users can zoom into continents, select individual countries, and view detailed, dynamic information such as population, land area, currency, languages, national flags, and rotating cultural facts like local dishes and traditions. The project focuses on combining geographic visualization, accurate country data, and clean UI design to deliver an engaging and educational experience.

## 🎯 Project Goals
- Make global geography interactive and engaging
- Present country data in a clear, visual format
- Encourage learning through dynamic facts
- Maintain performance and accuracy across all countries

## ✨ Features
- 🌐 Interactive 3D Globe: rotate, zoom, and pan smoothly
- 🗺️ Continent-Level Navigation: select a continent to expand and see its countries
- 🏳️ Country Exploration: click any country to view details with a flag-inspired palette
- 📊 Country Information: population, land area, capital, currency, languages, flag
- 🎲 Dynamic Fun Facts: randomized cultural facts (dishes, traditions, notable highlights)
- 🎨 Clean & Responsive UI: minimal popups, clear typography, desktop/tablet friendly

## 🧠 How TerraView Works
1. Global View: start on the 3D globe
2. Continent Focus: select a continent to zoom and highlight its countries
3. Country Selection: open a popup with structured country data and visuals
4. Dynamic Data: population/country data from public APIs, rotating fun facts, and flag-derived color palettes

## 🛠️ Tech Stack
- Frontend: JavaScript/TypeScript, HTML5, CSS3, React (Vite)
- Rendering: WebGL/Three.js via globe.gl; Canvas API for flag color extraction
- APIs & Data Sources: REST Countries (metadata), World Bank (population), curated cultural facts

## Project Structure

```
globe/
├── src/
│   ├── components/
│   │   ├── TerraViewGlobe.jsx
│   │   ├── ContinentView.jsx
│   │   ├── CountryLayer.jsx
│   │   └── CountryPopup.jsx
│   ├── services/
│   │   ├── CountryDataService.js
│   │   ├── PopulationService.js
│   │   ├── FunFactEngine.js
│   │   └── FlagColorExtractor.js
│   ├── utils/
│   │   ├── colorUtils.js
│   │   ├── flagColorExtractor.js
│   │   ├── countryMatcher.js
│   │   ├── funFactsGenerator.js
│   │   └── populationFormatter.js
│   ├── styles/
│   │   └── index.css
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx
│   └── assets/
├── public/
│   ├── terraview.svg
│   └── vite.svg
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── package.json
└── README.md
```

## Project Setup

### Prerequisites
- Node.js (v20.13.1 or higher recommended)
- npm (v10.5.2 or higher)

### Installation
1. Install dependencies
   ```bash
   npm install
   ```
2. Start the dev server
   ```bash
   npm run dev
   ```
3. Open in the browser (usually http://localhost:5173)

### Scripts
- Dev Server: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`

