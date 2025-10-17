// src/pages/MySavedRecipesPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify'; // Import toast
import './Page.css';

const MySavedRecipesPage = ({ allSpecials }) => {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { savedRecipeIds } = useAuth();

  const fetchSavedRecipes = () => {
    setLoading(true);
    axios.get('http://127.0.0.1:8000/api/users/me/saved-recipes')
      .then(res => {
        setSavedRecipes(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch saved recipes", err);
        setSavedRecipes([]);
      })
      .finally(() => setLoading(false));
  };

  // Fetch recipes on mount and when the user saves/unsaves something
  useEffect(() => {
    fetchSavedRecipes();
  }, [savedRecipeIds]);

  const handleDeleteRecipe = (recipeId) => {
    // This is a client-side delete for now, which is fine as it will be unsaved
    const newSaved = savedRecipes.filter(r => r.id !== recipeId);
    setSavedRecipes(newSaved);
  };
  
  // --- FIX: Re-implement the rating function ---
  const handleRateRecipe = (recipeId, rating) => {
    axios.post(`http://127.0.0.1:8000/api/recipes/${recipeId}/rate`, { rating })
      .then(() => {
        toast.success("Recipe rated!");
        // Re-fetch the saved recipes to get the updated rating info
        fetchSavedRecipes();
      })
      .catch(error => {
        console.error("Error rating recipe:", error);
        toast.error("Could not rate recipe.");
      });
  };

  return (
    <div className="app-container">
      <div className="page-header">
        <h1>My Saved Recipes</h1>
      </div>
      
      {loading ? (
        <p>Loading your saved recipes...</p>
      ) : savedRecipes.length > 0 ? (
        <div className="recipe-grid">
          {savedRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              allSpecials={allSpecials}
              onDelete={handleDeleteRecipe}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      ) : (
        <p className="empty-message">You haven't saved any recipes yet. Explore the dashboard to find some you like!</p>
      )}

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          allSpecials={allSpecials}
          // --- FIX: Pass the real rating function ---
          onRate={handleRateRecipe}
        />
      )}
    </div>
  );
};

export default MySavedRecipesPage;