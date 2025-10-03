// src/components/RecipeDetail.jsx

import React from 'react';
import './RecipeDetail.css';

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
            // Use the same simple matching logic as the other components
            const special = allSpecials.find(s => 
              s.ingredient_name.toLowerCase().includes(ingredient.name.toLowerCase())
            );
            
            return (
              <li key={index}>
                <span>{ingredient.quantity} {ingredient.name}</span>
                {/* Display the raw price string if a special was found */}
                {special && <span className="ingredient-price">{special.price}</span>}
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