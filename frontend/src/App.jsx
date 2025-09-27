// src/App.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import ShoppingList from './components/ShoppingList'; // Import the new component
import './App.css';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  // New state to track the array of selected recipes for the shopping list
  const [selectedRecipes, setSelectedRecipes] = useState([]);

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

  const handleSelectRecipe = (recipeToToggle) => {
    // Check if the recipe is already selected
    if (selectedRecipes.find(r => r.id === recipeToToggle.id)) {
      // If it is, remove it
      setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeToToggle.id));
    } else {
      // If it's not, add it
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