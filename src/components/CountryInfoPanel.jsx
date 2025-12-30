import { useEffect } from 'react';

/**
 * CountryInfoPanel Component
 * 
 * Displays country information in a beautiful popup modal.
 * Shows: name, flag, area, languages, currency, and a fun fact.
 * 
 * Why this design:
 * - Smooth fade-in animation for professional feel
 * - Clean, modern card design with backdrop
 * - Responsive and accessible
 * - Easy to close with X button or backdrop click
 */
function CountryInfoPanel({ country, isOpen, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !country) return null;

  // Extract country information
  const name = country.name?.common || country.name?.official || 'Unknown';
  const flag = country.flags?.svg || country.flags?.png || '';
  const area = country.area ? `${country.area.toLocaleString()} km²` : 'N/A';
  
  // Get languages
  const languages = country.languages 
    ? Object.values(country.languages).join(', ')
    : 'N/A';
  
  // Get currencies
  const currencies = country.currencies
    ? Object.entries(country.currencies)
        .map(([code, currency]) => `${currency.name} (${code})`)
        .join(', ')
    : 'N/A';
  
  // Get a fun fact (using capital city or region as a fact)
  const fact = country.capital 
    ? `The capital city is ${country.capital[0]}.`
    : country.region
    ? `Located in ${country.region}.`
    : 'A beautiful country with rich culture and history.';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-fadeIn">
          {/* Header with close button */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <h2 className="text-2xl font-bold">{name}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors duration-200 p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Flag */}
            {flag && (
              <div className="flex justify-center">
                <img
                  src={flag}
                  alt={`${name} flag`}
                  className="w-48 h-32 object-cover rounded-lg shadow-lg border-2 border-gray-200"
                />
              </div>
            )}

            {/* Country Information */}
            <div className="space-y-4">
              {/* Area */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Area</p>
                  <p className="text-lg font-semibold text-gray-900">{area}</p>
                </div>
              </div>

              {/* Languages */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Languages</p>
                  <p className="text-lg font-semibold text-gray-900">{languages}</p>
                </div>
              </div>

              {/* Currency */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Currency</p>
                  <p className="text-lg font-semibold text-gray-900">{currencies}</p>
                </div>
              </div>

              {/* Fun Fact */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-500">
                <p className="text-sm font-medium text-purple-600 mb-1">Did you know?</p>
                <p className="text-gray-700">{fact}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CountryInfoPanel;


