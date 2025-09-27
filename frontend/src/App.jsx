// src/App.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // We'll leave this for later styling

function App() {
  // Create a state variable to store our recipes
  const [recipes, setRecipes] = useState([]);
  // Create a state variable for loading status
  const [loading, setLoading] = useState(true);

  // useEffect runs once when the component first loads
  useEffect(() => {
    // Fetch data from our FastAPI backend
    axios.get('http://127.0.0.1:8000/api/recipes')
      .then(response => {
        setRecipes(response.data); // Store the fetched recipes in state
        setLoading(false); // Set loading to false
      })
      .catch(error => {
        console.error("There was an error fetching the recipes!", error);
        setLoading(false); // Also stop loading on error
      });
  }, []); // The empty array [] means this effect runs only once

  return (
    <div>
      <h1>Weekly Recipes</h1>
      {loading ? (
        <p>Loading recipes...</p>
      ) : (
        <div>
          {recipes.map(recipe => (
            <div key={recipe.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
              <h2>{recipe.title}</h2>
              <p>{recipe.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;