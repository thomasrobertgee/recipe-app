// src/components/RecipeDetail.jsx

import React from 'react';
import './RecipeDetail.css';

const RecipeDetail = ({ recipe, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>{recipe.title}</h2>
        <p className="description">{recipe.description}</p>

        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index}>
              {ingredient.quantity} {ingredient.name}
            </li>
          ))}
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