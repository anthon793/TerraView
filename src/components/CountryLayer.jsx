export default function CountryLayer({ countries = [], activeCode, onHover, onSelect }) {
  return (
    <div className="country-layer">
      {countries.map(country => (
        <button
          key={country.code || country.name}
          type="button"
          className={`country-tag${activeCode === country.code ? ' is-active' : ''}`}
          onMouseEnter={() => onHover?.(country)}
          onFocus={() => onHover?.(country)}
          onClick={() => onSelect?.(country)}
        >
          <span className="country-name">{country.name}</span>
        </button>
      ))}
    </div>
  );
}
