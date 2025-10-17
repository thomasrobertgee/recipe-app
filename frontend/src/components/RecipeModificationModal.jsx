// src/components/RecipeModificationModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext'; // --- Import useAuth ---
import api from '../api';
import './RecipeModificationModal.css';

const RecipeModificationModal = ({ originalRecipe, onClose }) => {
    const [modificationPrompt, setModificationPrompt] = useState('');
    const [modifiedRecipe, setModifiedRecipe] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [recipeToModify, setRecipeToModify] = useState(originalRecipe);
    const modalContentRef = useRef(null);
    const { saveRecipe } = useAuth(); // --- Get saveRecipe from context ---

    useEffect(() => {
        setRecipeToModify(originalRecipe);
    }, [originalRecipe]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!modificationPrompt.trim()) {
            toast.info("Please enter a modification request.");
            return;
        }

        setIsLoading(true);
        setModifiedRecipe(null);

        try {
            const payload = {
                original_recipe: recipeToModify,
                modification_prompt: modificationPrompt,
            };
            const response = await api.post('/api/recipes/modify', payload);
            setModifiedRecipe(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Failed to modify recipe. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModifyFurther = () => {
        setRecipeToModify(modifiedRecipe);
        setModifiedRecipe(null);
        setModificationPrompt('');
        toast.info("Ready for your next modification!");
        if (modalContentRef.current) {
            modalContentRef.current.scrollTop = 0;
        }
    };

    const handleSaveModifiedRecipe = async () => {
        if (!modifiedRecipe) return;

        try {
            const response = await api.post('/api/recipes', modifiedRecipe);
            const newRecipe = response.data;
            
            // --- FIX: Update the global state with the new saved recipe ID ---
            // This will make the UI update instantly.
            saveRecipe(newRecipe.id);
            
            toast.success(`"${newRecipe.title}" has been saved!`);
            onClose();
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Failed to save the modified recipe.";
            toast.error(errorMessage);
        }
    };

    return (
        <div className="modification-modal-overlay" onClick={onClose}>
            <div className="modification-modal-content" ref={modalContentRef} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="modal-close-btn">&times;</button>
                <h2>Modify Recipe</h2>
                
                {!modifiedRecipe && (
                    <form onSubmit={handleSubmit} className="modification-form">
                        <p>Enter your request below for "{recipeToModify.title}":</p>
                        <textarea
                            value={modificationPrompt}
                            onChange={(e) => setModificationPrompt(e.target.value)}
                            placeholder="e.g., make it vegan, double the servings..."
                            required
                        />
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? 'Thinking...' : 'Generate Modification'}
                        </button>
                    </form>
                )}

                {isLoading && <p className="loading-message">The AI is working its magic...</p>}

                {modifiedRecipe && (
                    <div className="modified-recipe-display">
                        <hr />
                        <h3>{modifiedRecipe.title}</h3>
                        <p>{modifiedRecipe.description}</p>
                        
                        <h4>Ingredients</h4>
                        <ul>
                            {modifiedRecipe.ingredients.map((ing, index) => (
                                <li key={index}>{ing.quantity} {ing.name}</li>
                            ))}
                        </ul>

                        <h4>Instructions</h4>
                        <ol>
                            {modifiedRecipe.instructions.split('\n').map((step, index) => {
                                const cleanedStep = step.trim().replace(/^\d+\.\s*/, '');
                                return cleanedStep && <li key={index}>{cleanedStep}</li>;
                            })}
                        </ol>

                        <div className="modified-recipe-actions">
                            <button onClick={handleModifyFurther} className="modify-further-btn">
                                🔄 Modify Further
                            </button>
                            <button onClick={handleSaveModifiedRecipe} className="save-modified-btn">
                                ✅ Save Modified Recipe
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipeModificationModal;