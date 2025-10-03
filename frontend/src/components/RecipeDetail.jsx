// src/components/RecipeDetail.jsx
import React from 'react';
import parsePrice from '../utils/priceUtils';
import './RecipeDetail.css';

// Re-use the same smart matching logic from our utility file
const findBestSpecialMatch = (ingredientName, allSpecials) => {
    const key = ingredientName.toLowerCase();
    let special = allSpecials.find(s => s.ingredient_name.toLowerCase() === key);
    if (special) return special;
    special = allSpecials.find(s => {
        const specialWords = s.ingredient_name.toLowerCase().split(' ');
        return specialWords.includes(key);
    });
    if (special) return special;
    return allSpecials.find(s => s.ingredient_name.toLowerCase().includes(key));
};

const RecipeDetail = ({ recipe, onClose, allSpecials }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>{recipe.title}</h2>
        <p className="description">{recipe.description}</p>
        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients.map((ingredient, index) => {
            const special = findBestSpecialMatch(ingredient.name, allSpecials);
            const priceInfo = special ? parsePrice(special.price) : null;
            let priceDisplay = '';
            if (priceInfo) {
                if (priceInfo.type === 'unit') priceDisplay = `$${priceInfo.cost.toFixed(2)}/item`;
                if (priceInfo.type === 'rate') priceDisplay = `$${priceInfo.rate.toFixed(2)}/${priceInfo.unit}`;
            }
            return (
              <li key={index}>
                <span>{ingredient.quantity} {ingredient.name}</span>
                {priceDisplay && <span className="ingredient-price">{priceDisplay}</span>}
              </li>
            );
          })}
        </ul>
        <h3>Instructions</h3>
        <div className="instructions">
          {recipe.instructions.split('\n').map((step, index) => (
            <p key={index}>{step}</p>
          ))}
        </div>
      </div>
    </div>
  );
};
export default RecipeDetail;