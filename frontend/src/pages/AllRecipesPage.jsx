// src/pages/AllRecipesPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import RecipeList from '../components/RecipeList';
import FilterSortControls from '../components/FilterSortControls';

const AllRecipesPage = ({ allSpecials }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { handleSelectRecipe, selectedRecipes } = useAuth();
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('');

  const fetchRecipes = () => {
    setLoading(true);
    const params = {};
    if (minRating) params.min_rating = minRating;
    if (sortBy) params.sort_by = sortBy;

    axios.get('http://127.0.0.1:8000/api/recipes', { params })
      .then(res => setRecipes(res.data))
      .catch(err => console.error("Error fetching recipes!", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRecipes(); }, [minRating, sortBy]);

  const handleDeleteRecipe = (recipeId) => {
    axios.delete(`http://127.0.0.1:8000/api/recipes/${recipeId}`)
      .then(() => {
        const deletedRecipe = recipes.find(r => r.id === recipeId);
        toast.success(`"${deletedRecipe.title}" was deleted.`);
        setRecipes(recipes.filter(r => r.id !== recipeId));
      })
      .catch(error => { console.error("Error deleting recipe:", error); });
  };

  const handleRateRecipe = (recipeId, rating) => {
    axios.post(`http://127.0.0.1:8000/api/recipes/${recipeId}/rate`, { rating })
      .then(() => {
        toast.success("Recipe rated!");
        fetchRecipes();
      })
      .catch(error => {
        console.error("Error rating recipe:", error);
        toast.error("Could not rate recipe.");
      });
  };

  return (
    <div className="app-container">
      <div className="page-header"><h1>All Generated Recipes</h1></div>
      <FilterSortControls
        minRating={minRating}
        setMinRating={setMinRating}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
      {loading ? <p>Loading recipes...</p> : (
        <RecipeList
          recipes={recipes}
          allSpecials={allSpecials}
          onDelete={handleDeleteRecipe}
          onRate={handleRateRecipe}
          onSelect={handleSelectRecipe}
          selectedRecipes={selectedRecipes}
        />
      )}
    </div>
  );
};

export default AllRecipesPage;