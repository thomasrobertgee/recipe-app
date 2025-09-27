// src/components/RecipeCard.jsx

import React from 'react';
import './RecipeCard.css';

// Add onClick to the props
const RecipeCard = ({ recipe, onClick }) => {
  return (
    // Add the onClick handler to the div
    <div className="recipe-card" onClick={onClick}>
      <h2>{recipe.title}</h2>
      <p>{recipe.description}</p>
    </div>
  );
};

export default RecipeCard;