// src/utils/priceUtils.js

// This function just finds the first dollar value in a string. It's simple and reliable.
const getSimplePrice = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
};

// This is our one and only recipe cost calculator.
export const calculateRecipeCost = (recipe, allSpecials) => {
    if (!recipe || !recipe.ingredients || !allSpecials) return 0;

    const costedSpecials = new Set(); // Prevents double-counting if a recipe lists the same ingredient twice
    let totalCost = 0;

    for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        
        // Find the special that contains the ingredient name.
        const special = allSpecials.find(s => s.ingredient_name.toLowerCase().includes(key));

        // If we found a special and haven't already added its cost, add it to the total.
        if (special && !costedSpecials.has(special.ingredient_name)) {
            totalCost += getSimplePrice(special.price);
            costedSpecials.add(special.ingredient_name);
        }
    }
    return totalCost;
};