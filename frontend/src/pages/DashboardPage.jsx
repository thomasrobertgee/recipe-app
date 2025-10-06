// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';

const DashboardPage = ({ allSpecials }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get('http://127.0.0.1:8000/api/recipes')
      .then(res => setRecipes(res.data))
      .catch(err => console.error("Failed to fetch recipes", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteRecipe = (recipeId) => { /* ... unchanged */ };

  return (
    <div className="app-container">
      <div className="page-header"><h1>Recipe Dashboard</h1></div>
      <div className="recipe-grid">
        {loading ? <p>Loading recipes...</p> : 
          recipes.slice(0, 9).map(recipe => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              allSpecials={allSpecials}
              onDelete={handleDeleteRecipe}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))
        }
      </div>
      {recipes.length > 9 && (
        <div className="view-more-container"><Link to="/recipes" className="view-more-btn">View All Recipes</Link></div>
      )}
      {selectedRecipe && (
        <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} allSpecials={allSpecials}/>
      )}
    </div>
  );
};
export default DashboardPage;