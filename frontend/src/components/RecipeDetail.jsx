// src/components/RecipeDetail.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCookMode } from '../context/CookModeContext';
import { toast } from 'react-toastify';
import StarRating from './StarRating';
import RecipeModificationModal from './RecipeModificationModal';
import RatingModal from './RatingModal'; // --- NEW: Import RatingModal ---
import './RecipeDetail.css';

const RecipeDetail = ({ recipe, onClose, allSpecials, onRate }) => {
    const { savedRecipeIds, saveRecipe, unsaveRecipe, handleSelectRecipe } = useAuth();
    const { startCookMode } = useCookMode();
    const isSaved = savedRecipeIds.has(recipe.id);

    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
    // --- NEW: State for the rating modal ---
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

    const specialsMap = useMemo(() => {
        return allSpecials.reduce((acc, special) => {
            acc[special.ingredient_name.toLowerCase()] = special.price;
            return acc;
        }, {});
    }, [allSpecials]);

    const handleSaveClick = (e) => {
        e.stopPropagation();
        isSaved ? unsaveRecipe(recipe.id) : saveRecipe(recipe.id);
    };

    const handleSelectClick = (e) => {
        e.stopPropagation();
        handleSelectRecipe(recipe);
    };

    const handleStartCookMode = (e) => {
        e.stopPropagation();
        startCookMode(recipe);
        onClose();
    };

    const handleModifyClick = (e) => {
        e.stopPropagation();
        setIsModifyModalOpen(true);
    };
    
    // --- NEW: Handlers for opening and submitting the rating modal ---
    const handleOpenRatingModal = () => {
        setIsRatingModalOpen(true);
    };

    const handleRatingSubmit = (rating) => {
        onRate(recipe.id, rating);
        setIsRatingModalOpen(false); // Close the modal after submitting
    };

    return (
        <>
            <div className="recipe-detail-overlay" onClick={onClose}>
                <div className="recipe-detail" onClick={(e) => e.stopPropagation()}>
                    <button onClick={onClose} className="close-button">&times;</button>
                    <h2>{recipe.title}</h2>
                    <div className="recipe-meta" onClick={handleOpenRatingModal} style={{cursor: 'pointer'}}>
                        <StarRating 
                            rating={recipe.average_rating} 
                            // --- FIX: Star rating is now read-only and opens the modal ---
                            readOnly={true}
                        />
                        <span className="rating-count">({recipe.rating_count} ratings) - Click to rate</span>
                    </div>

                    <p className="description">{recipe.description}</p>
                    
                    <div className="recipe-actions">
                        <button onClick={handleSaveClick} className={`action-btn ${isSaved ? 'saved' : ''}`}>
                            {isSaved ? '✓ Unsave' : 'Save Recipe'}
                        </button>
                        <button onClick={handleModifyClick} className="action-btn modify-btn">
                            ✨ Modify with AI
                        </button>
                        <button onClick={handleStartCookMode} className="action-btn cook-mode-btn">
                            Start Cooking
                        </button>
                        <button onClick={handleSelectClick} className="action-btn add-list-btn">
                            + Add to List
                        </button>
                    </div>

                    <div className="recipe-columns">
                        <div className="ingredients-section">
                            <h3>Ingredients</h3>
                            <ul>
                                {recipe.ingredients.map(ing => (
                                    <li key={ing.ingredient_id}>
                                        {ing.quantity} {ing.name}
                                        {specialsMap[ing.name.toLowerCase()] && (
                                            <span className="special-tag">ON SPECIAL</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="instructions-section">
                            <h3>Instructions</h3>
                            <ol>
                                {recipe.instructions.split('\n').map((step, index) => (
                                    step.trim() ? <li key={index}>{step}</li> : null
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
            
            {isModifyModalOpen && (
                <RecipeModificationModal 
                    originalRecipe={recipe}
                    onClose={() => setIsModifyModalOpen(false)}
                />
            )}

            {/* --- NEW: Conditionally render the rating modal --- */}
            {isRatingModalOpen && (
                <RatingModal 
                    recipeTitle={recipe.title}
                    onClose={() => setIsRatingModalOpen(false)}
                    onSubmit={handleRatingSubmit}
                />
            )}
        </>
    );
};

export default RecipeDetail;