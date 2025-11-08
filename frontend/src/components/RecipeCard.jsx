// src/components/RecipeCard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCookMode } from '../context/CookModeContext'; // <-- NEW
import RecipeDetail from './RecipeDetail';
import StarRating from './StarRating';
import './RecipeCard.css';

const RecipeCard = ({ recipe, allSpecials, onUpdateRating }) => {
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const { handleSelectRecipe, selectedRecipes, savedRecipeIds, saveRecipe, unsaveRecipe } = useAuth();
  const { startCookMode } = useCookMode(); // <-- NEW

  const isSelected = selectedRecipes.some(item => item.recipe.id === recipe.id);
  const isSaved = savedRecipeIds.has(recipe.id);

  // --- REMOVED: Broken cost badge logic ---

  const handleToggleDetail = () => {
    setIsDetailVisible(!isDetailVisible);
  };

  const handleSaveClick = (e) => {
    e.stopPropagation(); // Prevent modal from opening
    if (isSaved) {
      unsaveRecipe(recipe.id);
    } else {
      saveRecipe(recipe);
    }
  };

  const handleSelectClick = (e) => {
    e.stopPropagation(); // Prevent modal from opening
    handleSelectRecipe(recipe);
  };

  // --- NEW: Cook Mode Handler ---
  const handleCookClick = (e) => {
     e.stopPropagation(); // Prevent modal from opening
     startCookMode(recipe);
  };


  return (
    <>
      <div className="recipe-card" onClick={handleToggleDetail}>
        <div className="recipe-card-header">
           {/* --- NEW: Cook Mode Button --- */}
          <button
            className="cook-mode-btn"
            onClick={handleCookClick}
            title="Start Cook Mode"
          >
            🔥
          </button>
          
          <button
            className={`save-recipe-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSaveClick}
            title={isSaved ? "Remove from saved" : "Save recipe"}
          >
            {isSaved ? '★' : '☆'}
          </button>
        </div>

        {/* <div className="recipe-card-image">
          <img src="https://via.placeholder.com/300x200" alt={recipe.title} />
        </div> */}

        <div className="recipe-card-content">
          <h3 className="recipe-card-title">{recipe.title}</h3>
          
          <div className="recipe-card-rating">
            <StarRating
              rating={recipe.average_rating}
              totalRatings={recipe.rating_count}
            />
          </div>

          <p className="recipe-card-description">{recipe.description}</p>
          
          <div className="recipe-card-tags">
            {recipe.tags && recipe.tags.map((tag, index) => (
              <span key={index} className="recipe-card-tag">{tag}</span>
            ))}
            {/* --- REMOVED: costBadge display --- */}
          </div>
          
          <button
            className={`recipe-card-select-btn ${isSelected ? 'selected' : ''}`}
            onClick={handleSelectClick}
          >
            {isSelected ? '✓ Added to List' : '+ Add to List'}
          </button>
        </div>
      </div>

      {isDetailVisible && (
        <RecipeDetail
          recipe={recipe}
          onClose={handleToggleDetail}
          onUpdateRating={onUpdateRating} // Pass the handler down
        />
      )}
    </>
  );
};

export default RecipeCard;