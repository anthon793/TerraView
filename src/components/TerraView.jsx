/**
 * TerraView - Main Visualization Component
 * 
 * WHY: This component orchestrates the entire multi-mode visualization system.
 * It combines the mode controller, renderers, and UI into a cohesive experience.
 * 
 * FEATURES:
 * - Mode switching buttons (top-left corner)
 * - Multiple visualization modes (Globe, Satellite, 2D Map)
 * - Shared popup for country information
 * - State preserved when switching modes
 * 
 * ARCHITECTURE:
 * - Uses RenderModeController for managing renderers
 * - Subscribes to countryStore for popup state
 * - Handles window resize for responsive layout
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import RenderModeController, { MODE_INFO, VISUALIZATION_MODES } from '../controllers/RenderModeController';
import { subscribe, closePanel } from '../store/countryStore';
import CountryInfoPopup from './CountryInfoPopup';

// ============================================================================
// Mode Button Component
// ============================================================================

/**
 * Individual mode button with active state styling
 */
function ModeButton({ mode, isActive, isLoading, onClick }) {
    return (
        <button
            onClick={() => onClick(mode.id)}
            disabled={isLoading}
            className={`
        mode-button
        ${isActive ? 'mode-button--active' : ''}
        ${isLoading ? 'mode-button--loading' : ''}
      `}
            title={mode.description}
            aria-pressed={isActive}
        >
            <span className="mode-button__icon">{mode.icon}</span>
            <span className="mode-button__label">{mode.name}</span>
        </button>
    );
}

/**
 * Mode selector button group
 */
function ModeSwitcher({ currentMode, isLoading, onModeChange }) {
    return (
        <div className="mode-switcher">
            <div className="mode-switcher__label">View:</div>
            <div className="mode-switcher__buttons">
                {MODE_INFO.map(mode => (
                    <ModeButton
                        key={mode.id}
                        mode={mode}
                        isActive={currentMode === mode.id}
                        isLoading={isLoading}
                        onClick={onModeChange}
                    />
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// TerraView Component
// ============================================================================

export default function TerraView() {
    // Container ref for renderer
    const containerRef = useRef(null);

    // Mode controller ref
    const controllerRef = useRef(null);

    // Current mode state
    const [currentMode, setCurrentMode] = useState(VISUALIZATION_MODES.GLOBE_SATELLITE);
    const [isLoadingMode, setIsLoadingMode] = useState(true);

    // Country popup state (from store)
    const [popupState, setPopupState] = useState({
        isPanelOpen: false,
        countryData: null,
        isLoadingCountry: false,
        localFacts: [],
    });

    /**
     * Handle mode change from UI
     */
    const handleModeChange = useCallback(async (modeId) => {
        if (!controllerRef.current) return;

        setIsLoadingMode(true);
        await controllerRef.current.switchMode(modeId);
        setCurrentMode(modeId);
        setIsLoadingMode(false);
    }, []);

    /**
     * Handle popup close
     */
    const handleClosePopup = useCallback(() => {
        closePanel();
    }, []);

    /**
     * Initialize controller and subscribe to store
     */
    useEffect(() => {
        if (!containerRef.current) return;

        console.log('[TerraView] Initializing...');

        // Create mode controller
        const controller = new RenderModeController(containerRef.current);
        controllerRef.current = controller;

        // Subscribe to mode changes from controller
        const unsubscribeMode = controller.onModeChange((newMode) => {
            setCurrentMode(newMode);
        });

        // Subscribe to country store for popup state
        const unsubscribeStore = subscribe((state) => {
            setPopupState({
                isPanelOpen: state.isPanelOpen,
                countryData: state.countryData,
                isLoadingCountry: state.isLoadingCountry,
                localFacts: state.localFacts,
            });
        });

        // Initialize with default mode
        controller.initialize(VISUALIZATION_MODES.GLOBE_SATELLITE)
            .then(() => {
                setIsLoadingMode(false);
                console.log('[TerraView] Initialized successfully');
            })
            .catch(err => {
                console.error('[TerraView] Initialization error:', err);
                setIsLoadingMode(false);
            });

        // Handle window resize
        const handleResize = () => {
            controller.handleResize();
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            console.log('[TerraView] Cleaning up...');
            unsubscribeMode();
            unsubscribeStore();
            window.removeEventListener('resize', handleResize);
            controller.destroy();
        };
    }, []);

    return (
        <div className="terraview">
            {/* Mode Switcher UI - Top Left */}
            <div className="terraview__controls">
                <div className="controls-group">
                    <ModeSwitcher
                        currentMode={currentMode}
                        isLoading={isLoadingMode}
                        onModeChange={handleModeChange}
                    />

                    <button
                        onClick={() => controllerRef.current?.selectRandomCountry()}
                        className="surprise-button"
                        title="Fly to a random country"
                    >
                        <span className="surprise-button__icon">🎲</span>
                        <span className="surprise-button__label">Surprise Me</span>
                    </button>
                </div>
            </div>

            {/* Renderer Container */}
            <div
                ref={containerRef}
                className="terraview__container"
            />

            {/* Loading Indicator */}
            {isLoadingMode && (
                <div className="terraview__loading">
                    <div className="terraview__loading-spinner" />
                    <span>Loading view...</span>
                </div>
            )}

            {/* Country Info Popup - Shared across all modes */}
            <CountryInfoPopup
                country={popupState.countryData}
                isOpen={popupState.isPanelOpen}
                onClose={handleClosePopup}
                isLoadingCountry={popupState.isLoadingCountry}
                localFacts={popupState.localFacts}
                mode={currentMode}
            />
        </div>
    );
}
