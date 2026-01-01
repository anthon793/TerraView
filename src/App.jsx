import { useEffect } from 'react';
import GlobeView from './components/GlobeView';
import { loadCapitalData } from './services/CapitalService';

/**
 * Main App Component
 * 
 * This is the root component that controls the overall application flow.
 * Currently displays the GlobeView - we'll add view switching logic later.
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
      <GlobeView />
    </div>
  );
}

export default App;
