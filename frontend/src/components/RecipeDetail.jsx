// src/components/RecipeDetail.jsx
import React, { useState } from 'react';
import RatingModal from './RatingModal';
import StarRating from './StarRating';
import './RecipeDetail.css';

const RecipeDetail = ({ recipe, onClose, allSpecials, onRate }) => {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const handleSubmitRating = (rating) => {
    if (onRate) {
      onRate(recipe.id, rating);
    }
    setIsRatingModalOpen(false);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={onClose}>×</button>

          <div className="recipe-detail-header">
            <h2>{recipe.title}</h2>
            <div className="rating-section">
              {/* --- UPDATED --- */}
              <div className="rating-display">
                <StarRating rating={recipe.average_rating} readOnly={true} />
                {recipe.rating_count > 0 && (
                  <span className="rating-value">({recipe.average_rating.toFixed(1)})</span>
                )}
              </div>
              <button className="rate-recipe-btn" onClick={() => setIsRatingModalOpen(true)}>
                Rate Recipe
              </button>
            </div>
          </div>

          <p className="description">{recipe.description}</p>
          <h3>Ingredients</h3>
          <ul>
            {recipe.ingredients.map((ingredient, index) => {
              const special = allSpecials.find(s => 
                s.ingredient_name.toLowerCase().includes(ingredient.name.toLowerCase())
              );

              return (
                <li key={index}>
                  <span>{ingredient.quantity} {ingredient.name}</span>
                  {special && <span className="ingredient-price">{special.price}</span>}
                </li>
              );
            })}
          </ul>
          <h3>Instructions</h3>
          <div className="instructions">
            {recipe.instructions.split('\n').map((step, index) => (
              <p key={index}>{step}</p>
            ))}
          </div>
        </div>
      </div>

      {isRatingModalOpen && (
        <RatingModal
          recipeTitle={recipe.title}
          onClose={() => setIsRatingModalOpen(false)}
          onSubmitRating={handleSubmitRating}
        />
      )}
    </>
  );
};

export default RecipeDetail;