// src/pages/AllRecipesPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import RecipeList from '../components/RecipeList';

const AllRecipesPage = ({ allSpecials }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { handleSelectRecipe, selectedRecipes } = useAuth(); // Get global state and functions

  const fetchRecipes = () => {
    setLoading(true);
    axios.get('http://127.0.0.1:8000/api/recipes')
      .then(res => setRecipes(res.data))
      .catch(err => console.error("Error fetching recipes!", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRecipes(); }, []);

  const handleDeleteRecipe = (recipeId) => {
    axios.delete(`http://127.0.0.1:8000/api/recipes/${recipeId}`)
      .then(() => {
        const deletedRecipe = recipes.find(r => r.id === recipeId);
        toast.success(`"${deletedRecipe.title}" was deleted.`);
        setRecipes(recipes.filter(r => r.id !== recipeId));
      })
      .catch(error => { console.error("Error deleting recipe:", error); });
  };

  return (
    <div className="app-container">
      <div className="page-header"><h1>All Generated Recipes</h1></div>
      {loading ? <p>Loading recipes...</p> : (
        <RecipeList 
          recipes={recipes}
          allSpecials={allSpecials}
          onDelete={handleDeleteRecipe}
          // Pass the necessary props down to the list component
          onSelect={handleSelectRecipe}
          selectedRecipes={selectedRecipes}
        />
      )}
    </div>
  );
};

export default AllRecipesPage;