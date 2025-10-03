// src/pages/MySavedRecipesPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail'; // Import RecipeDetail
import { useAuth } from '../context/AuthContext';

const MySavedRecipesPage = () => {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [allSpecials, setAllSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null); // State for the modal
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([
        axios.get('http://127.0.0.1:8000/api/users/me/saved-recipes'),
        axios.get('http://127.0.0.1:8000/api/specials')
      ]).then(([recipesRes, specialsRes]) => {
        setSavedRecipes(recipesRes.data);
        setAllSpecials(specialsRes.data);
      }).catch(error => {
        console.error("Error fetching data for saved recipes page:", error);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [token]);

  const placeholderFunc = () => {};

  return (
    <div>
      <h1>My Saved Recipes</h1>
      <div className="recipe-grid">
        {loading ? (
          <p>Loading your saved recipes...</p>
        ) : savedRecipes.length > 0 ? (
          savedRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              allSpecials={allSpecials}
              onSelect={placeholderFunc}
              onDelete={placeholderFunc}
              onClick={() => setSelectedRecipe(recipe)} // Open the modal on click
              isSelected={false}
            />
          ))
        ) : (
          <p>You haven't saved any recipes yet. Click the heart icon on a recipe to save it!</p>
        )}
      </div>
      
      {/* Conditionally render the modal */}
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

export default MySavedRecipesPage;