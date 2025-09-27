// src/App.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail'; // Import the new modal component
import './App.css';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  // New state to track the selected recipe for the modal
  const [selectedRecipe, setSelectedRecipe] = useState(null);

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

  return (
    <div className="app-container">
      <h1>Weekly Recipes</h1>
      {loading ? (
        <p>Loading recipes...</p>
      ) : (
        <div className="recipe-list">
          {recipes.map(recipe => (
            // When a card is clicked, update the selectedRecipe state
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              onClick={() => setSelectedRecipe(recipe)} 
            />
          ))}
        </div>
      )}

      {/* If a recipe is selected, show the RecipeDetail modal */}
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