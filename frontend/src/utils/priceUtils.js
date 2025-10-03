// src/utils/priceUtils.js

// This function just finds the first dollar value in a string.
const getSimplePrice = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
};

// This function now just adds up the simple price of each on-special ingredient.
export const calculateRecipeCost = (recipe, allSpecials) => {
    if (!recipe || !recipe.ingredients || !allSpecials) return 0;
    let totalCost = 0;
    const costedSpecials = new Set(); // Prevents double-counting the same special item

    for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        const special = allSpecials.find(s => s.ingredient_name.toLowerCase().includes(key));

        if (special && !costedSpecials.has(special.ingredient_name)) {
            totalCost += getSimplePrice(special.price);
            costedSpecials.add(special.ingredient_name);
        }
    }
    return totalCost;
};