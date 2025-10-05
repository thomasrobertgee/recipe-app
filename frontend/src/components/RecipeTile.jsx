// src/components/RecipeTile.jsx

import React from 'react';

const RecipeTile = ({ recipe }) => {
  return (
    <div className="recipe-tile">
      <h3>{recipe.title}</h3>
      <p>{recipe.description}</p>
      {/* Add more recipe details here as needed */}
    </div>
  );
};

export default RecipeTile;