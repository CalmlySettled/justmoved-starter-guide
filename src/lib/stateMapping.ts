// State mapping utility for US News Health directory links
export const stateToUSNewsPath: Record<string, string> = {
  // Full state names to US News URL format
  'alabama': 'alabama',
  'alaska': 'alaska',
  'arizona': 'arizona',
  'arkansas': 'arkansas',
  'california': 'california',
  'colorado': 'colorado',
  'connecticut': 'connecticut',
  'delaware': 'delaware',
  'florida': 'florida',
  'georgia': 'georgia',
  'hawaii': 'hawaii',
  'idaho': 'idaho',
  'illinois': 'illinois',
  'indiana': 'indiana',
  'iowa': 'iowa',
  'kansas': 'kansas',
  'kentucky': 'kentucky',
  'louisiana': 'louisiana',
  'maine': 'maine',
  'maryland': 'maryland',
  'massachusetts': 'massachusetts',
  'michigan': 'michigan',
  'minnesota': 'minnesota',
  'mississippi': 'mississippi',
  'missouri': 'missouri',
  'montana': 'montana',
  'nebraska': 'nebraska',
  'nevada': 'nevada',
  'new hampshire': 'new-hampshire',
  'new jersey': 'new-jersey',
  'new mexico': 'new-mexico',
  'new york': 'new-york',
  'north carolina': 'north-carolina',
  'north dakota': 'north-dakota',
  'ohio': 'ohio',
  'oklahoma': 'oklahoma',
  'oregon': 'oregon',
  'pennsylvania': 'pennsylvania',
  'rhode island': 'rhode-island',
  'south carolina': 'south-carolina',
  'south dakota': 'south-dakota',
  'tennessee': 'tennessee',
  'texas': 'texas',
  'utah': 'utah',
  'vermont': 'vermont',
  'virginia': 'virginia',
  'washington': 'washington',
  'west virginia': 'west-virginia',
  'wisconsin': 'wisconsin',
  'wyoming': 'wyoming',
  'district of columbia': 'washington-dc',
  
  // Common abbreviations
  'al': 'alabama',
  'ak': 'alaska',
  'az': 'arizona',
  'ar': 'arkansas',
  'ca': 'california',
  'co': 'colorado',
  'ct': 'connecticut',
  'de': 'delaware',
  'fl': 'florida',
  'ga': 'georgia',
  'hi': 'hawaii',
  'id': 'idaho',
  'il': 'illinois',
  'in': 'indiana',
  'ia': 'iowa',
  'ks': 'kansas',
  'ky': 'kentucky',
  'la': 'louisiana',
  'me': 'maine',
  'md': 'maryland',
  'ma': 'massachusetts',
  'mi': 'michigan',
  'mn': 'minnesota',
  'ms': 'mississippi',
  'mo': 'missouri',
  'mt': 'montana',
  'ne': 'nebraska',
  'nv': 'nevada',
  'nh': 'new-hampshire',
  'nj': 'new-jersey',
  'nm': 'new-mexico',
  'ny': 'new-york',
  'nc': 'north-carolina',
  'nd': 'north-dakota',
  'oh': 'ohio',
  'ok': 'oklahoma',
  'or': 'oregon',
  'pa': 'pennsylvania',
  'ri': 'rhode-island',
  'sc': 'south-carolina',
  'sd': 'south-dakota',
  'tn': 'tennessee',
  'tx': 'texas',
  'ut': 'utah',
  'vt': 'vermont',
  'va': 'virginia',
  'wa': 'washington',
  'wv': 'west-virginia',
  'wi': 'wisconsin',
  'wy': 'wyoming',
  'dc': 'washington-dc',
};

// Medical categories that should redirect to US News Health
export const medicalCategories = [
  'pediatricians',
  'doctors',
  'physicians',
  'medical',
  'healthcare',
  'urgent care',
  'medical centers',
  'clinics',
  'family medicine',
  'primary care',
  'specialists',
  'dentists',
  'orthodontists',
  'dermatologists',
  'cardiologists',
  'neurologists',
  'psychiatrists',
  'orthopedic',
  'ophthalmologists',
  'gynecologists',
  'urologists',
  'radiologists',
  'anesthesiologists',
  'pathologists',
  'plastic surgeons',
  'surgeons'
];

/**
 * Get the US News Health URL path for a given state
 * @param location - The location data containing city information
 * @returns The US News Health URL path or null if state cannot be determined
 */
export function getUSNewsStatePath(location: { city?: string }): string | null {
  if (!location.city) {
    console.log('No city found in location data:', location);
    return null;
  }
  
  console.log('Attempting to extract state from city:', location.city);
  
  // Try multiple approaches to extract state
  const cityStr = location.city.toLowerCase();
  
  // First, check if any state name/abbreviation is contained in the city string
  for (const [key, value] of Object.entries(stateToUSNewsPath)) {
    if (cityStr.includes(key)) {
      console.log(`Found state "${key}" in city string, mapping to: ${value}`);
      return value;
    }
  }
  
  // Fallback: try splitting by comma and using the last part
  const cityParts = location.city.split(',');
  console.log('City parts:', cityParts);
  
  if (cityParts.length >= 2) {
    const state = cityParts[cityParts.length - 1].trim().toLowerCase();
    console.log('Extracted state from comma split:', state);
    const statePath = stateToUSNewsPath[state];
    if (statePath) {
      console.log('Final state path:', statePath);
      return statePath;
    }
  }
  
  console.log('No state found, returning null');
  return null;
}

/**
 * Check if a category is medical-related
 * @param category - The category search term
 * @returns True if the category is medical-related
 */
export function isMedicalCategory(category: string): boolean {
  const normalizedCategory = category.toLowerCase();
  return medicalCategories.some(medicalTerm => 
    normalizedCategory.includes(medicalTerm)
  );
}

/**
 * Get the complete US News Health URL for a state
 * @param statePath - The state path (e.g., 'connecticut')
 * @returns The complete US News Health URL
 */
export function getUSNewsHealthURL(statePath: string): string {
  return `https://health.usnews.com/doctors/${statePath}`;
}