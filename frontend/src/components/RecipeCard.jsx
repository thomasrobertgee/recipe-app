// src/components/RecipeCard.jsx

import React from 'react';
import './RecipeCard.css';

// Add onSelect and isSelected to the props
const RecipeCard = ({ recipe, onClick, onSelect, isSelected }) => {

  const handleSelectClick = (e) => {
    // Stop the click from bubbling up to the card's onClick
    e.stopPropagation(); 
    onSelect(recipe);
  };

  return (
    // Add a dynamic 'selected' class and the main onClick handler
    <div 
      className={`recipe-card ${isSelected ? 'selected' : ''}`} 
      onClick={onClick}
    >
      <div className="card-content">
        <h2>{recipe.title}</h2>
        <p>{recipe.description}</p>
      </div>
      <button onClick={handleSelectClick}>
        {isSelected ? 'Deselect' : 'Select'}
      </button>
    </div>
  );
};

export default RecipeCard;