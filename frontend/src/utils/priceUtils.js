// src/utils/priceUtils.js

export const getSimplePrice = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
};

// --- NEW: Fuzzy matching logic to find the best special for an ingredient ---
export const findBestSpecialMatch = (ingredientName, allSpecials) => {
  if (!ingredientName || !allSpecials) return null;

  const lowerCaseIngredient = ingredientName.toLowerCase();

  // 1. Look for an exact match first
  const exactMatch = allSpecials.find(s => s.ingredient_name.toLowerCase() === lowerCaseIngredient);
  if (exactMatch) return exactMatch;
  
  // 2. If no exact match, look for a partial match
  return allSpecials.find(s => s.ingredient_name.toLowerCase().includes(lowerCaseIngredient));
};

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