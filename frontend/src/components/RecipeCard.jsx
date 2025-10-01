// src/components/RecipeCard.jsx

import React from 'react';
import './RecipeCard.css';

const RecipeCard = ({ recipe, onClick, onSelect, isSelected, onDelete }) => {

  const handleSelectClick = (e) => {
    e.stopPropagation(); 
    onSelect(recipe);
  };

  // --- NEW: Handler for the delete button ---
  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent the modal from opening
    if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      onDelete(recipe.id);
    }
  };

  return (
    <div 
      className={`recipe-card ${isSelected ? 'selected' : ''}`} 
      onClick={onClick}
    >
      {/* --- NEW: Delete button in the corner --- */}
      <button className="delete-btn" onClick={handleDeleteClick}>×</button>

      <div className="card-content">
        <h2>{recipe.title}</h2>
        <p>{recipe.description}</p>
      </div>
      <button onClick={handleSelectClick} className="select-btn">
        {isSelected ? 'Deselect' : 'Select'}
      </button>
    </div>
  );
};

export default RecipeCard;