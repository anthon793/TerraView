# Country Information System - Implementation Guide

## Overview
This implementation provides a clean, performant country information popup with:
- Dual population sources (REST Countries + World Bank)
- Dynamic fun facts (Wikipedia + local data)
- Smart caching to minimize API calls
- Modern, responsive UI

## Architecture

### Core Components

#### 1. **CountryInfoPopup** (`src/components/CountryInfoPopup.jsx`)
The main popup component that displays country information.

**Features:**
- Clean, centered modal with gradient header
- Responsive grid layout for country info
- On-demand World Bank population fetching
- Dynamic fact rotation without refetching
- Keyboard support (ESC to close)

**Props:**
- `country` - Country data from REST Countries API
- `isOpen` - Control visibility
- `onClose` - Close handler
- `isLoadingCountry` - Loading state for initial data fetch
- `localFacts` - Array of local facts to combine with Wikipedia data

#### 2. **Custom Hooks**

**useCountryPopulation** (`src/hooks/useCountryPopulation.js`)
- Manages default (REST Countries) and accurate (World Bank) population data
- Only fetches World Bank data when user clicks "View accurate data"
- Caches results in localStorage
- Returns formatted strings with clear labeling

**useCountryFacts** (`src/hooks/useCountryFacts.js`)
- Fetches Wikipedia summary once per country
- Combines Wikipedia sentences with local facts
- Provides instant fact rotation (no refetch)
- Caches Wikipedia data in localStorage

#### 3. **Utilities**

**populationFormatter.js** (`src/utils/populationFormatter.js`)
- `formatNumber()` - Adds commas to numbers
- `fetchWorldBankPopulation()` - Fetches from World Bank API with caching

**funFactsGenerator.js** (`src/utils/funFactsGenerator.js`)
- `fetchWikipediaSummary()` - Fetches and caches Wikipedia summaries
- `getRandomFact()` - Returns random fact from combined sources
- `getAllFacts()` - Returns all available facts

#### 4. **Data Files**

**countryFacts.js** (`src/data/countryFacts.js`)
- Static local facts organized by ISO Alpha-3 code
- Cultural facts, food specialties, interesting trivia
- Example data for 20+ countries
- Easy to extend

## Data Flow

### Initial Country Click
```
User clicks country
  → GlobeView fetches REST Countries data
  → Opens CountryInfoPopup
  → useCountryFacts fetches Wikipedia (once, cached)
  → Display: flag, area, population (estimated), languages, currency, random fact
```

### Accurate Population Request
```
User clicks "View accurate data"
  → useCountryPopulation.fetchAccuratePopulation()
  → Fetches World Bank API (once, cached in localStorage)
  → Shows: "Population (2022): 223,804,632 — Source: World Bank"
```

### Fact Rotation
```
User clicks "More facts"
  → useCountryFacts.getNextFact()
  → Randomly selects from cached facts (Wikipedia + local)
  → Instant update, no API call
```

## Integration Example

```jsx
import CountryInfoPopup from './components/CountryInfoPopup';
import { getLocalFacts } from './data/countryFacts';

function YourComponent() {
  const [countryData, setCountryData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleCountryClick = async (countryName) => {
    const data = await fetchCountryData(countryName);
    setCountryData(data);
    setIsOpen(true);
  };

  return (
    <CountryInfoPopup
      country={countryData}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      isLoadingCountry={false}
      localFacts={countryData?.cca3 ? getLocalFacts(countryData.cca3) : []}
    />
  );
}
```

## API Usage

### REST Countries API
```
GET https://restcountries.com/v3.1/name/{country}
```
Used for: Name, flag, area, population (default), languages, currencies, ISO codes

### Wikipedia REST API
```
GET https://en.wikipedia.org/api/rest_v1/page/summary/{country}
```
Used for: Fun facts extracted from summary
Cached: localStorage
Frequency: Once per country

### World Bank API
```
GET https://api.worldbank.org/v2/country/{ISO2}/indicator/SP.POP.TOTL?format=json
```
Used for: Accurate population with year
Cached: localStorage
Frequency: Only when user requests (on-demand)

## Performance Optimizations

1. **Caching Strategy**
   - Wikipedia summaries → localStorage (persistent)
   - World Bank data → localStorage (persistent)
   - REST Countries → memory cache in countryMatcher.js

2. **Lazy Loading**
   - World Bank API only called when user clicks "View accurate data"
   - Never fetched on initial page load or country click

3. **Smart Fact Rotation**
   - Facts fetched once, rotated from cache
   - No API calls for subsequent fact requests

4. **React Performance**
   - Custom hooks prevent unnecessary re-renders
   - useCallback for handlers
   - Memoized calculations

## Key Design Decisions

### Population Labeling
✅ **Do:** "Latest available estimate" or "Estimated population"  
❌ **Don't:** "Real-time population" or misleading claims

### World Bank Integration
✅ **On-demand only** - User must explicitly request  
❌ **Never** fetch on page load or automatic country click

### Fun Facts
✅ **Random rotation** from cached pool  
✅ **Combine** Wikipedia + local facts  
❌ **Never** refetch on each rotation

### UI/UX Principles
- **Clean & Minimal** - No clutter, easy to scan
- **Clear Labeling** - Users know data sources
- **Responsive** - Works on all screen sizes
- **Accessible** - Keyboard navigation (ESC to close)
- **Fast** - No unnecessary API calls

## Adding More Countries

To add local facts for new countries, edit `src/data/countryFacts.js`:

```javascript
export const countryFacts = {
  // ... existing countries
  
  "NZL": [ // New Zealand - use ISO Alpha-3 code
    "New Zealand was the first country to give women the right to vote.",
    "There are more sheep than people in New Zealand - about 6 sheep per person.",
    "The Pavlova dessert is claimed by both New Zealand and Australia."
  ],
};
```

## Troubleshooting

### World Bank data not showing
- Check browser console for API errors
- Verify country has `cca2` property (ISO 2-letter code)
- Check localStorage quota (clear if full)

### Facts not rotating
- Verify Wikipedia API returned data (check localStorage)
- Ensure localFacts prop is being passed correctly
- Check that country has ISO Alpha-3 code for local facts

### Popup not appearing
- Ensure `isOpen` prop is true
- Check that country data is valid
- Verify no z-index conflicts with other components

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires localStorage support
- Tailwind CSS for styling (ensure configured)

## Future Enhancements

Potential additions without compromising performance:
- Historical population graphs (on-demand)
- Weather data integration
- Travel recommendations
- User-submitted facts
- Multi-language support
