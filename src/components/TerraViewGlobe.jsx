import { useEffect, useRef } from 'react';

export default function TerraViewGlobe({ countries = [], onCountrySelect }) {
  const globeRef = useRef(null);

  useEffect(() => {
    // TODO: Mount globe renderer and wire hover/select callbacks.
  }, [countries]);

  return (
    <div className="terraview-globe" ref={globeRef} role="presentation" aria-label="TerraView globe">
      {/* Globe canvas mounts here */}
    </div>
  );
}
