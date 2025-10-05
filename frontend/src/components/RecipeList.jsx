// src/components/RecipeList.jsx
import React, { useState } from 'react';
import RecipeCard from './RecipeCard'; // Assuming RecipeCard.jsx is the correct name
import RecipeDetail from './RecipeDetail';

const RecipeList = ({ recipes, allSpecials, onSelect, onDelete, selectedRecipes }) => {
  const [visibleCount, setVisibleCount] = useState(9);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  return (
    <div>
      <div className="recipe-grid">
        {recipes.slice(0, visibleCount).map(recipe => {
          const isSelected = selectedRecipes.some(r => r.id === recipe.id);
          return (
            <RecipeCard 
              key={recipe.id}
              recipe={recipe}
              allSpecials={allSpecials}
              onSelect={onSelect}
              onDelete={onDelete}
              isSelected={isSelected}
              onClick={() => setSelectedRecipe(recipe)}
            />
          );
        })}
      </div>

      {visibleCount < recipes.length && (
        <div className="view-more-container">
          <button onClick={() => setVisibleCount(current => current + 9)} className="view-more-btn">
            View More Recipes
          </button>
        </div>
      )}

      {selectedRecipe && (
        <RecipeDetail 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)}
          allSpecials={allSpecials}
        />
      )}
    </div>
  );
};

export default RecipeList;