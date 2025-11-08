// src/utils/priceUtils.js

/**
 * Parses a price string (e.g., "$19.99/kg", "$1.50/ea", "2 for $5.00")
 * and returns the primary numeric value.
 * @param {string} priceString - The price string to parse.
 * @returns {number | null} - The parsed price as a number, or null.
 */
export const parsePrice = (priceString) => {
    if (!priceString) return null;

    // 1. Handle "2 for $5.00" -> 5.00
    const forMatch = priceString.match(/for\s*\$(\d+\.\d{2})/);
    if (forMatch && forMatch[1]) {
        return parseFloat(forMatch[1]);
    }

    // 2. Handle "$19.99/kg" or "$1.50" -> 19.99 or 1.50
    const dollarMatch = priceString.match(/\$(\d+\.\d{2})/);
    if (dollarMatch && dollarMatch[1]) {
        return parseFloat(dollarMatch[1]);
    }

    // 3. Handle "$0.80" -> 0.80
    const centMatch = priceString.match(/\$(\d+\.\d{1,2})/);
        if (centMatch && centMatch[1]) {
        return parseFloat(centMatch[1]);
    }
    
    // 4. Handle "80c" -> 0.80
        const centOnlyMatch = priceString.match(/(\d+)c/);
        if (centOnlyMatch && centOnlyMatch[1]) {
            return parseFloat(centOnlyMatch[1]) / 100;
        }

    // Fallback: try to find any number
    const fallbackMatch = priceString.match(/(\d+\.\d{2})/);
        if (fallbackMatch && fallbackMatch[1]) {
        return parseFloat(fallbackMatch[1]);
    }
    
    const simpleNumMatch = priceString.match(/(\d+)/);
        if (simpleNumMatch && simpleNumMatch[1]) {
            return parseFloat(simpleNumMatch[1]);
        }

    return null; // Could not parse
};