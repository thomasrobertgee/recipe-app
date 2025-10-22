// src/utils/priceUtils.js

export const getSimplePrice = (priceString) => {
    if (!priceString) return 0;
    // --- Using original regex to ensure consistency ---
    const match = priceString.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
};

// --- NEW: Fuzzy matching logic to find the best special for an ingredient ---
// --- Using original simpler fuzzy match logic ---
export const findBestSpecialMatch = (ingredientName, allSpecials) => {
    if (!ingredientName || !allSpecials) return null;

    const lowerCaseIngredient = ingredientName.toLowerCase().trim(); // Added trim for safety

    // 1. Look for an exact match first
    const exactMatch = allSpecials.find(s => s.ingredient_name.toLowerCase().trim() === lowerCaseIngredient);
    if (exactMatch) return exactMatch;

    // 2. If no exact match, look for a partial match (ingredient name contains special name)
    const partialMatchContains = allSpecials.find(s => lowerCaseIngredient.includes(s.ingredient_name.toLowerCase().trim()));
    if (partialMatchContains) return partialMatchContains;

    // 3. If still no match, look for special name contains ingredient name (more broad)
    const partialMatchIncludedIn = allSpecials.find(s => s.ingredient_name.toLowerCase().trim().includes(lowerCaseIngredient));
    if (partialMatchIncludedIn) return partialMatchIncludedIn;

    // If no match found at all
    return null; // Return null if no match found
};

// --- Restored calculateSingleRecipeCost function ---
export const calculateSingleRecipeCost = (recipe, allSpecials) => {
    if (!recipe || !recipe.ingredients || !allSpecials) return 0;

    const costedSpecials = new Set();
    let totalCost = 0;

    for (const ingredient of recipe.ingredients) {
        const special = findBestSpecialMatch(ingredient.name, allSpecials);

        if (special && !costedSpecials.has(special.ingredient_name)) {
            totalCost += getSimplePrice(special.price);
            costedSpecials.add(special.ingredient_name);
        }
    }
    return totalCost;
};