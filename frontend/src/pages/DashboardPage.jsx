// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import ShoppingList from '../components/ShoppingList';
import RecipeCard from '../components/RecipeCard';
import RecipeDetail from '../components/RecipeDetail';

const DashboardPage = () => {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [allSpecials, setAllSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedRecipes, setSelectedRecipes] = useState(() => {
    const saved = localStorage.getItem('selectedRecipes');
    return saved ? JSON.parse(saved) : [];
  });

  const fetchInitialData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [recipesRes, specialsRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/recipes'),
        axios.get('http://127.0.0.1:8000/api/specials'),
      ]);
      setRecipes(recipesRes.data);
      setAllSpecials(specialsRes.data);
    } catch (error) {
      console.error("Failed to fetch initial data", error);
      toast.error("Could not load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, [token]);
  useEffect(() => { localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes)); }, [selectedRecipes]);

  const handleSelectRecipe = (recipeToToggle) => {
    if (selectedRecipes.find(r => r.id === recipeToToggle.id)) {
      setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeToToggle.id));
      toast.info(`"${recipeToToggle.title}" removed from list.`);
    } else {
      setSelectedRecipes([...selectedRecipes, recipeToToggle]);
      toast.success(`"${recipeToToggle.title}" added to list!`);
    }
  };

  const handleDeleteRecipe = (recipeId) => {
    axios.delete(`http://127.0.0.1:8000/api/recipes/${recipeId}`)
      .then(() => {
        const deletedRecipe = recipes.find(r => r.id === recipeId);
        toast.success(`"${deletedRecipe.title}" was deleted.`);
        setRecipes(recipes.filter(r => r.id !== recipeId));
        setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeId));
      })
      .catch(error => { console.error("Error deleting recipe:", error); });
  };

  return (
    <div>
      <h1>Recipe Dashboard</h1>
      <div className="main-content">
        <div className="recipe-grid">
          {loading ? <p>Loading recipes...</p> : 
            recipes.slice(0, 9).map(recipe => {
              const isSelected = selectedRecipes.some(r => r.id === recipe.id);
              return (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  onSelect={handleSelectRecipe} 
                  isSelected={isSelected}
                  allSpecials={allSpecials}
                  onDelete={handleDeleteRecipe}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              );
            })
          }
        </div>
        <div className="shopping-list-section">
          <ShoppingList selectedRecipes={selectedRecipes} allSpecials={allSpecials} />
        </div>
      </div>
      
      {recipes.length > 9 && (
        <div className="view-more-container">
          <Link to="/recipes" className="view-more-btn">View All Recipes</Link>
        </div>
      )}

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

export default DashboardPage;