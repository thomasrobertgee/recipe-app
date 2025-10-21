// src/components/RecipeCard.jsx

import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { calculateSingleRecipeCost } from '../utils/priceUtils';
import StarRating from './StarRating';
import './RecipeCard.css';

// --- Destructure onRate from props ---
const RecipeCard = ({ recipe, onClick, onDelete, allSpecials, onRate }) => {
    const {
        // --- Use savedRecipeIds which is the Set ---
        savedRecipeIds,
        // --- Use saveRecipe/unsaveRecipe functions ---
        saveRecipe,
        unsaveRecipe,
        selectedRecipes,
        handleSelectRecipe, // Keep using this name if context provides it
        incrementRecipeQuantity,
        decrementRecipeQuantity
    } = useAuth();

    const cost = useMemo(() => calculateSingleRecipeCost(recipe, allSpecials), [recipe, allSpecials]);
    // --- Check savedRecipeIds Set correctly ---
    const isSaved = savedRecipeIds ? savedRecipeIds.has(recipe.id) : false; // Add safety check for savedRecipeIds

    // Ensure selectedRecipes is an array before using .find()
    const selectedItem = Array.isArray(selectedRecipes) ? selectedRecipes.find(item => item.recipe.id === recipe.id) : undefined;
    const isSelected = !!selectedItem;
    const currentQuantity = selectedItem ? selectedItem.quantity : 0;

    const handleSaveClick = (e) => {
        e.stopPropagation();
        if (isSaved) {
            unsaveRecipe(recipe.id);
        } else {
             // Assuming saveRecipe now takes the full recipe object based on context changes
            saveRecipe(recipe);
        }
    };
    const handleDeleteClick = (e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${recipe.title}"?`)) {
            onDelete(recipe.id);
        }
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

    // --- Add safety check for average_rating ---
    const displayRating = typeof recipe.average_rating === 'number' ? recipe.average_rating : 0;
    const displayRatingText = typeof recipe.average_rating === 'number' ? recipe.average_rating.toFixed(1) : 'N/A';

    // Added 'is-saved' class to main div if isSaved is true
    return (
        <div className={`recipe-card ${isSelected ? 'selected' : ''} ${isSaved ? 'is-saved' : ''}`} onClick={onClick}>
            <div className="card-header-actions">
                {/* --- *** FIX: Removed "Save" text *** --- */}
                <button className={`save-btn ${isSaved ? 'saved' : ''}`} onClick={handleSaveClick}>{isSaved ? '♥' : '♡'}</button>
                {/* --- *** END FIX *** --- */}
                {onDelete && <button className="delete-btn" onClick={handleDeleteClick}>×</button>}
            </div>
            <div className="card-content">
                <div className="card-title-row">
                    <h2>{recipe.title}</h2>
                    {cost > 0 && (<div className="recipe-cost">${cost.toFixed(2)}</div>)}
                </div>
                {recipe.description && <p>{recipe.description}</p>}
                <div className="card-rating-display">
                    <StarRating rating={displayRating} readOnly={true} />
                    {recipe.rating_count > 0 && (
                        <span className="rating-value">({displayRatingText})</span>
                    )}
                     {recipe.rating_count === 0 && (
                          <span className="rating-value">(No ratings yet)</span>
                     )}
                </div>
                {recipe.tags && recipe.tags.length > 0 && (
                    <div className="card-tags">
                        {recipe.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
            <div className="card-bottom-action">
                {isSelected ? (
                    <div className="quantity-stepper">
                        <button onClick={handleDecrement}>-</button>
                        <span>{currentQuantity}</span>
                        <button onClick={handleIncrement}>+</button>
                    </div>
                ) : (
                     handleSelectRecipe && (
                          <button onClick={handleAddClick} className="select-btn">
                              Add to Shopping List
                          </button>
                     )
                )}
            </div>
        </div>
    );
};

export default RecipeCard;