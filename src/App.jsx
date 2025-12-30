import GlobeView from './components/GlobeView';

/**
 * Main App Component
 * 
 * This is the root component that controls the overall application flow.
 * Currently displays the GlobeView - we'll add view switching logic later.
 */
function App() {
  return (
    <div className="App">
      <GlobeView />
    </div>
  );
}

export default App;
