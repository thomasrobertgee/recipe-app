// src/components/RecipeCard.jsx

import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { calculateSingleRecipeCost } from '../utils/priceUtils';
import StarRating from './StarRating';
import './RecipeCard.css';

const RecipeCard = ({ recipe, onClick, onDelete, allSpecials }) => {
  const { 
    savedRecipeIds, 
    saveRecipe, 
    unsaveRecipe, 
    selectedRecipes, 
    handleSelectRecipe,
    incrementRecipeQuantity,
    decrementRecipeQuantity 
  } = useAuth();

  const cost = useMemo(() => calculateSingleRecipeCost(recipe, allSpecials), [recipe, allSpecials]);
  const isSaved = savedRecipeIds.has(recipe.id);
  
  // --- UPDATED: Logic to find the selected item and its quantity ---
  const selectedItem = selectedRecipes.find(item => item.recipe.id === recipe.id);
  const isSelected = !!selectedItem;
  const currentQuantity = selectedItem ? selectedItem.quantity : 0;

  const handleSaveClick = (e) => { e.stopPropagation(); if (isSaved) unsaveRecipe(recipe.id); else saveRecipe(recipe.id); };
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) { onDelete(recipe.id); }
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    incrementRecipeQuantity(recipe.id);
  };
  const handleDecrement = (e) => {
    e.stopPropagation();
    decrementRecipeQuantity(recipe.id);
  };
  const handleAddClick = (e) => {
    e.stopPropagation();
    handleSelectRecipe(recipe);
  };

  return (
    <div className={`recipe-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-header-actions">
        <button className={`save-btn ${isSaved ? 'saved' : ''}`} onClick={handleSaveClick}>{isSaved ? '♥' : '♡'}</button>
        <button className="delete-btn" onClick={handleDeleteClick}>×</button>
      </div>
      <div className="card-content">
        <div className="card-title-row">
          <h2>{recipe.title}</h2>
          {cost > 0 && (<div className="recipe-cost">${cost.toFixed(2)}</div>)}
        </div>
        <p>{recipe.description}</p>
        <div className="card-rating-display">
          <StarRating rating={recipe.average_rating} readOnly={true} />
          {recipe.rating_count > 0 && (
            <span className="rating-value">({recipe.average_rating.toFixed(1)})</span>
          )}
        </div>
      </div>
      <div className="card-bottom-action">
        {/* --- UPDATED: Conditionally render button or stepper --- */}
        {isSelected ? (
            <div className="quantity-stepper">
                <button onClick={handleDecrement}>-</button>
                <span>{currentQuantity}</span>
                <button onClick={handleIncrement}>+</button>
            </div>
        ) : (
            <button onClick={handleAddClick} className="select-btn">
                Add to Shopping List
            </button>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;