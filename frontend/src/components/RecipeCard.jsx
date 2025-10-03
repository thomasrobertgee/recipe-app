// src/components/RecipeCard.jsx

import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { calculateRecipeCost } from '../utils/priceUtils'; // Import the one true calculator
import './RecipeCard.css';

const RecipeCard = ({ recipe, onClick, onSelect, isSelected, onDelete, allSpecials }) => {
  const { savedRecipeIds, saveRecipe, unsaveRecipe } = useAuth();
  
  // Use the central utility to calculate cost.
  const cost = useMemo(() => calculateRecipeCost(recipe, allSpecials), [recipe, allSpecials]);
  const isSaved = savedRecipeIds.has(recipe.id);

  const handleSaveClick = (e) => {
    e.stopPropagation();
    if (isSaved) { unsaveRecipe(recipe.id); } else { saveRecipe(recipe.id); }
  };
  const handleSelectClick = (e) => { e.stopPropagation(); onSelect(recipe); };
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) { onDelete(recipe.id); }
  };

  return (
    <div className={`recipe-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-header-actions">
        <button className={`save-btn ${isSaved ? 'saved' : ''}`} onClick={handleSaveClick}>
          {isSaved ? '♥' : '♡'}
        </button>
        <button className="delete-btn" onClick={handleDeleteClick}>×</button>
      </div>
      <div className="card-content">
        <div className="card-title-row">
          <h2>{recipe.title}</h2>
          {/* Display the calculated cost */}
          {cost > 0 && (<div className="recipe-cost">${cost.toFixed(2)}</div>)}
        </div>
        <p>{recipe.description}</p>
      </div>
      <div className="card-bottom-action">
        <button onClick={handleSelectClick} className="select-btn">{isSelected ? 'Remove from List' : 'Add to Shopping List'}</button>
      </div>
    </div>
  );
};
export default RecipeCard;