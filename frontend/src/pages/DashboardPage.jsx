// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';
import FilterSortControls from '../components/FilterSortControls';

const DashboardPage = ({ allSpecials }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  
  // --- NEW: State to hold all possible tags from the API ---
  const [allAvailableTags, setAllAvailableTags] = useState([]);

  // --- NEW: Fetch all tags once on component mount ---
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/tags')
      .then(res => setAllAvailableTags(res.data))
      .catch(err => console.error("Error fetching tags!", err));
  }, []);

  const fetchRecipes = () => {
    setLoading(true);
    const params = {};
    if (minRating) params.min_rating = minRating;
    if (sortBy) params.sort_by = sortBy;
    if (selectedTags.length > 0) params.tags = selectedTags.join(',');

    axios.get('http://127.0.0.1:8000/api/recipes', { params })
      .then(res => setRecipes(res.data))
      .catch(err => console.error("Failed to fetch recipes", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecipes()
  }, [minRating, sortBy, selectedTags]);

  const handleDeleteRecipe = (recipeId) => {
    axios.delete(`http://127.0.0.1:8000/api/recipes/${recipeId}`)
      .then(() => {
        toast.success("Recipe deleted.");
        fetchRecipes();
      })
      .catch(err => console.error("Failed to delete recipe", err));
   };

  const handleRateRecipe = (recipeId, rating) => {
    axios.post(`http://127.0.0.1:8000/api/recipes/${recipeId}/rate`, { rating })
      .then(() => {
        toast.success("Recipe rated!");
        fetchRecipes();
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

  const handleTagClick = (tag) => {
    setSelectedTags(prevTags => 
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };

  return (
    <div className="app-container">
      <div className="page-header"><h1>Recipe Dashboard</h1></div>
      <FilterSortControls
        minRating={minRating}
        setMinRating={setMinRating}
        sortBy={sortBy}
        setSortBy={setSortBy}
        // --- UPDATED: Pass the stable list of all tags ---
        availableTags={allAvailableTags}
        selectedTags={selectedTags}
        handleTagClick={handleTagClick}
      />
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
export default DashboardPage;