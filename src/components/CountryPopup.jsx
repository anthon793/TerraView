export default function CountryPopup({ country, onClose }) {
  if (!country) return null;

  return (
    <aside className="country-popup" role="dialog" aria-label={`${country.name} details`}>
      <header className="country-popup__header">
        <div className="country-popup__title">
          <span className="country-popup__name">{country.name}</span>
          {country.region ? <span className="country-popup__region">{country.region}</span> : null}
        </div>
        <button type="button" className="country-popup__close" onClick={onClose} aria-label="Close">
          x
        </button>
      </header>
      <div className="country-popup__body">
        {country.capital ? <p><strong>Capital:</strong> {country.capital}</p> : null}
        {country.population ? <p><strong>Population:</strong> {country.population}</p> : null}
        {country.fact ? <p className="country-popup__fact">{country.fact}</p> : null}
      </div>
    </aside>
  );
}
