// src/utils/priceUtils.js

// --- UPDATED: Export this function ---
export const getSimplePrice = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
};

const findBestSpecialMatch = (ingredientName, allSpecials) => {
  const lowerCaseIngredient = ingredientName.toLowerCase();
  const searchRegex = new RegExp(`\\b${lowerCaseIngredient}\\b`, 'i');

  const exactMatch = allSpecials.find(s => s.ingredient_name.toLowerCase() === lowerCaseIngredient);
  if (exactMatch) return exactMatch;

  const wholeWordMatch = allSpecials.find(s => searchRegex.test(s.ingredient_name));
  if (wholeWordMatch) return wholeWordMatch;
  
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

export const calculateRecipeCost = (consolidatedItems) => {
    if (!consolidatedItems) return 0;
    
    return consolidatedItems.reduce((total, item) => {
        return total + getSimplePrice(item.priceString);
    }, 0);
};