<<<<<<< HEAD
# TerraView
A clear, immersive view of the Earth — from globe to country-level insights.
=======
# Interactive World Geography App - MVP

A minimal but working MVP of an interactive world geography web app built with React, Vite, and 3D globe visualization.

## Project Setup

### Prerequisites
- Node.js (v20.13.1 or higher recommended)
- npm (v10.5.2 or higher)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   - Navigate to the URL shown in the terminal (typically `http://localhost:5173`)
   - You should see a rotating 3D globe

## Current Status

### ✅ Completed (Step 1)
- Vite + React project setup
- Dependencies installed:
  - `globe.gl` - 3D globe visualization
  - `three.js` - 3D graphics library
  - `d3.js` - Data visualization (for future continent maps)
  - `tailwindcss` - Styling framework
- Basic rotating 3D globe component (`GlobeView`)
- Tailwind CSS configured

### 🚧 Next Steps
- Add continent click detection
- Create continent expansion view
- Add country information display
- Integrate REST Countries API

## Project Structure

```
globe/
├── src/
│   ├── components/
│   │   └── GlobeView.jsx    # 3D rotating globe component
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind CSS imports
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
└── package.json             # Dependencies and scripts
```

## Tech Stack

- **React** (Vite) - UI framework
- **JavaScript** - Programming language
- **globe.gl** - 3D globe visualization
- **three.js** - 3D graphics
- **D3.js** - Data visualization (for continent maps)
- **Tailwind CSS** - Styling
- **REST Countries API** - Country data (to be integrated)

## Development

- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`
>>>>>>> 17d5e93 (Initial commit)
