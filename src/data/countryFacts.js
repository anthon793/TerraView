/**
 * Local Facts Data - Example
 * 
 * This file contains cultural facts, food specialties, and interesting trivia
 * organized by ISO Alpha-3 country codes.
 * 
 * Format:
 * {
 *   "ISO3": ["fact 1", "fact 2", ...],
 *   ...
 * }
 * 
 * Usage:
 * Import this data and pass it to CountryInfoPopup as localFacts prop
 * The popup will combine these with Wikipedia facts for dynamic rotation
 */

export const countryFacts = {
  // USA
  "USA": [
    "The United States has no official language at the federal level.",
    "New York City is home to over 800 languages, making it the most linguistically diverse city in the world.",
    "The American hot dog culture originated from German immigrants in the 1800s."
  ],
  
  // Canada
  "CAN": [
    "Canada has the longest coastline of any country in the world.",
    "Poutine, made with fries, gravy, and cheese curds, was invented in Quebec in the 1950s.",
    "Canada consumes more macaroni and cheese than any other nation."
  ],
  
  // France
  "FRA": [
    "France is the most visited country in the world, with over 89 million tourists annually.",
    "French bread by law cannot contain preservatives.",
    "Croissants were actually invented in Austria, not France."
  ],
  
  // Italy
  "ITA": [
    "Italy has more UNESCO World Heritage Sites than any other country.",
    "Traditional pizza Margherita was created to honor Queen Margherita in 1889.",
    "Italians consume an average of 23 kg of pasta per person per year."
  ],
  
  // Japan
  "JPN": [
    "Japan has more than 6,800 islands, though only about 430 are inhabited.",
    "Ramen was voted as Japan's best invention of the 20th century.",
    "Japan is home to the world's oldest company, Kongo Gumi, founded in 578 AD."
  ],
  
  // Mexico
  "MEX": [
    "Mexico City is built on a lake and is sinking at a rate of 6-8 inches per year.",
    "Chocolate was first discovered by the ancient Mayans and Aztecs in Mexico.",
    "Mexican cuisine was declared a UNESCO Intangible Cultural Heritage in 2010."
  ],
  
  // Brazil
  "BRA": [
    "Brazil is home to approximately 60% of the Amazon rainforest.",
    "Feijoada, a black bean and pork stew, is considered Brazil's national dish.",
    "Portuguese is spoken by more people in Brazil than in Portugal."
  ],
  
  // India
  "IND": [
    "India is the world's largest democracy with over 900 million eligible voters.",
    "There are at least 19,500 languages and dialects spoken in India.",
    "The popular chicken tikka masala was likely invented in Glasgow, Scotland, not India."
  ],
  
  // China
  "CHN": [
    "China has the world's oldest continuous civilization, spanning over 4,000 years.",
    "Fortune cookies were actually invented in San Francisco, not China.",
    "Every year, China uses more cement than the rest of the world combined."
  ],
  
  // United Kingdom
  "GBR": [
    "The UK has been invaded successfully only twice in the last 1,000 years.",
    "Chicken tikka masala is considered Britain's most popular dish.",
    "London has over 170 museums, more than any other city in the world."
  ],
  
  // Germany
  "DEU": [
    "Germany has over 1,500 varieties of beer and more than 5,000 brands.",
    "The pretzel originated as a Christian symbol during medieval times.",
    "Germany was the first country in the world to adopt Daylight Saving Time."
  ],
  
  // Spain
  "ESP": [
    "Spain is the world's largest producer of olive oil, accounting for 44% of global production.",
    "The Spanish national anthem has no words.",
    "Paella, Spain's famous dish, was originally made with rabbit and snails, not seafood."
  ],
  
  // Australia
  "AUS": [
    "Australia is home to 21 of the world's 25 most venomous snakes.",
    "The Great Barrier Reef is the world's largest living structure.",
    "Australians eat more meat per capita than any other nation."
  ],
  
  // Egypt
  "EGY": [
    "The ancient Egyptians were the first to invent paper, made from papyrus plants.",
    "Egyptian bread is one of the oldest continuously made foods, dating back 30,000 years.",
    "Egypt is home to the only remaining Ancient Wonder of the World, the Great Pyramid of Giza."
  ],
  
  // South Africa
  "ZAF": [
    "South Africa has 11 official languages.",
    "Biltong, a dried cured meat snack, has been made in South Africa for centuries.",
    "Table Mountain in Cape Town is older than the Himalayas."
  ],
  
  // Argentina
  "ARG": [
    "Argentina is the 8th largest country in the world by land area.",
    "Asado, the traditional Argentine barbecue, is considered an art form and social event.",
    "The tango dance originated in the working-class neighborhoods of Buenos Aires."
  ],
  
  // Greece
  "GRC": [
    "Greece has more archaeological museums than any other country.",
    "Greek feta cheese is protected by EU law and can only be made in Greece.",
    "No point in Greece is more than 85 miles from water."
  ],
  
  // Thailand
  "THA": [
    "Thailand is the only Southeast Asian country never colonized by a European power.",
    "Pad Thai was invented in the 1930s as part of a nationalist campaign.",
    "Bangkok's full ceremonial name is the longest city name in the world at 168 letters."
  ],
  
  // Netherlands
  "NLD": [
    "The Netherlands is the world's second-largest exporter of food by value.",
    "Dutch cheese markets have been operating continuously since the Middle Ages.",
    "Over 25% of the Netherlands is below sea level."
  ],
  
  // Sweden
  "SWE": [
    "Sweden has not been at war since 1814, making it one of the longest-lasting periods of peace.",
    "Swedish meatballs were actually inspired by Turkish cuisine.",
    "Sweden recycles 99% of its household waste."
  ]
};

/**
 * Get local facts for a country by ISO Alpha-3 code
 * @param {string} cca3 - ISO Alpha-3 country code
 * @returns {string[]} Array of facts or empty array
 */
export function getLocalFacts(cca3) {
  return countryFacts[cca3] || [];
}
