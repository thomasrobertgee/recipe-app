// src/components/RecipeCard.jsx

import React from 'react';
import './RecipeCard.css';

const RecipeCard = ({ recipe, onClick, onSelect, isSelected, onDelete }) => {
  
  const handleSelectClick = (e) => {
    e.stopPropagation(); // Prevents the card's onClick from firing
    onSelect(recipe);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevents the card's onClick from firing
    if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      onDelete(recipe.id);
    }
  };

  return (
    <div 
      className={`recipe-card ${isSelected ? 'selected' : ''}`} 
      onClick={onClick}
    >
      {/* NEW: Delete button at top right */}
      <div className="card-header-actions">
        <button className="delete-btn" onClick={handleDeleteClick}>×</button>
      </div>

      <div className="card-content">
        <h2>{recipe.title}</h2>
        <p>{recipe.description}</p>
      </div>

      {/* NEW: Select button at the bottom center */}
      <div className="card-bottom-action">
        <button onClick={handleSelectClick} className="select-btn">
          {isSelected ? 'Remove from List' : 'Add to Shopping List'} {/* Updated text */}
        </button>
      </div>
    </div>
  );
};

export default RecipeCard;