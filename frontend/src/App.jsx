// src/App.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import ShoppingList from './components/ShoppingList';
import './App.css';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // --- CHANGE 1: Initialize state from localStorage ---
  // The state now checks localStorage for a saved list on first load.
  const [selectedRecipes, setSelectedRecipes] = useState(() => {
    const saved = localStorage.getItem('selectedRecipes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/recipes')
      .then(response => {
        setRecipes(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("There was an error fetching the recipes!", error);
        setLoading(false);
      });
  }, []);

  // --- CHANGE 2: Save state changes to localStorage ---
  // This new useEffect runs every time 'selectedRecipes' changes.
  useEffect(() => {
    localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes));
  }, [selectedRecipes]);

  const handleSelectRecipe = (recipeToToggle) => {
    if (selectedRecipes.find(r => r.id === recipeToToggle.id)) {
      setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeToToggle.id));
    } else {
      setSelectedRecipes([...selectedRecipes, recipeToToggle]);
    }
  };

  return (
    <div className="app-container">
      <h1>Recipe Saver</h1>
      <div className="main-content">
        <div className="recipe-grid">
          {loading ? (
            <p>Loading recipes...</p>
          ) : (
            recipes.map(recipe => {
              // We need to find the full recipe object for isSelected check
              const isSelected = selectedRecipes.some(r => r.id === recipe.id);
              return (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  onClick={() => setSelectedRecipe(recipe)}
                  onSelect={handleSelectRecipe}
                  isSelected={isSelected}
                />
              );
            })
          )}
        </div>
        <div className="shopping-list-section">
          <ShoppingList selectedRecipes={selectedRecipes} />
        </div>
      </div>
      {selectedRecipe && (
        <RecipeDetail 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)} 
        />
      )}
    </div>
  );
}

export default App;