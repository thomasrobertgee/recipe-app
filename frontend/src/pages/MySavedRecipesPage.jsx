// src/pages/MySavedRecipesPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';
import { useAuth } from '../context/AuthContext';
import FilterSortControls from '../components/FilterSortControls';

const MySavedRecipesPage = () => {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [allSpecials, setAllSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { token } = useAuth();
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('');

  const fetchSavedRecipes = () => {
    if (token) {
      setLoading(true);
      Promise.all([
        axios.get('http://127.0.0.1:8000/api/users/me/saved-recipes'),
        axios.get('http://127.0.0.1:8000/api/specials')
      ]).then(([recipesRes, specialsRes]) => {
        let filteredRecipes = recipesRes.data;

        if (minRating) {
            filteredRecipes = filteredRecipes.filter(r => r.average_rating >= minRating);
        }
        if (sortBy === 'rating_asc') {
            filteredRecipes.sort((a, b) => a.average_rating - b.average_rating);
        } else if (sortBy === 'rating_desc') {
            filteredRecipes.sort((a, b) => b.average_rating - a.average_rating);
        }
        
        setSavedRecipes(filteredRecipes);
        setAllSpecials(specialsRes.data);

      }).catch(error => {
        console.error("Error fetching data for saved recipes page:", error);
      }).finally(() => {
        setLoading(false);
      });
    }
  }

  useEffect(() => {
    fetchSavedRecipes()
  }, [token, minRating, sortBy]);

  const placeholderFunc = () => {};

  const handleRateRecipe = (recipeId, rating) => {
    axios.post(`http://127.0.0.1:8000/api/recipes/${recipeId}/rate`, { rating })
      .then(() => {
        toast.success("Recipe rated!");
        fetchSavedRecipes();
         if(selectedRecipe && selectedRecipe.id === recipeId) {
            const updatedRecipe = { ...selectedRecipe, average_rating: rating, rating_count: selectedRecipe.rating_count + 1 };
            setSelectedRecipe(updatedRecipe);
        }
      })
      .catch(error => {
        console.error("Error rating recipe:", error);
        toast.error("Could not rate recipe.");
      });
  };

  return (
    <div className="app-container">
      <div className="page-header"><h1>My Saved Recipes</h1></div>
      {/* --- UPDATED: Pass empty/dummy props for tags --- */}
      <FilterSortControls
        minRating={minRating}
        setMinRating={setMinRating}
        sortBy={sortBy}
        setSortBy={setSortBy}
        availableTags={[]}
        selectedTags={[]}
        handleTagClick={() => {}}
      />
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
              onClick={() => setSelectedRecipe(recipe)}
              isSelected={false}
            />
          ))
        ) : (
          <p>You haven't saved any recipes yet. Click the heart icon on a recipe to save it!</p>
        )}
      </div>
      
      {selectedRecipe && (
        <RecipeDetail 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)}
          allSpecials={allSpecials}
          onRate={handleRateRecipe}
        />
      )}
    </div>
  );
};

export default MySavedRecipesPage;