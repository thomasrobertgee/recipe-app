// src/components/RecipeCard.jsx
import React, { useMemo } from 'react';
import { calculateRecipeCost } from '../utils/priceUtils';
import './RecipeCard.css';

const RecipeCard = ({ recipe, onClick, onSelect, isSelected, onDelete, allSpecials }) => {
  const cost = useMemo(() => calculateRecipeCost(recipe, allSpecials), [recipe, allSpecials]);
  const handleSelectClick = (e) => { e.stopPropagation(); onSelect(recipe); };
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
      onDelete(recipe.id);
    }
  };
  return (
    <div className={`recipe-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-header-actions"><button className="delete-btn" onClick={handleDeleteClick}>×</button></div>
      <div className="card-content">
        <div className="card-title-row">
          <h2>{recipe.title}</h2>
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