export default function ContinentView({ continents = [], onSelect }) {
  return (
    <div className="continent-view">
      {continents.map(continent => (
        <button
          key={continent.code || continent.name}
          type="button"
          className="continent-chip"
          onClick={() => onSelect?.(continent)}
        >
          <span className="continent-name">{continent.name}</span>
        </button>
      ))}
    </div>
  );
}
