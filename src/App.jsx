import { useEffect } from 'react';
import TerraView from './components/TerraView';
import { loadCapitalData } from './services/CapitalService';
import './styles/TerraView.css';

/**
 * Main App Component
 * 
 * This is the root component that controls the overall application flow.
 * Now uses the multi-mode TerraView component for visualization.
 * 
 * Changes from original:
 * - Replaced GlobeView with TerraView (multi-mode visualization)
 * - TerraView handles mode switching (Globe, Satellite, 2D Map)
 * - Country popup is now managed by the shared countryStore
 */
function App() {
  // Load capital data once at application startup
  useEffect(() => {
    loadCapitalData().catch(err => {
      console.warn('Failed to preload capital data:', err);
    });
  }, []);

  return (
    <div className="App">
      <TerraView />
    </div>
  );
}

export default App;
