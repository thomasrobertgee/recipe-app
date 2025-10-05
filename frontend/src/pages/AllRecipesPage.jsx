// src/pages/AllRecipesPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import RecipeList from '../components/RecipeList'; // Import our new component

const AllRecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [allSpecials, setAllSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipes, setSelectedRecipes] = useState(() => {
    const saved = localStorage.getItem('selectedRecipes');
    return saved ? JSON.parse(saved) : [];
  });

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const recipesResponse = await axios.get('http://127.0.0.1:8000/api/recipes');
      const specialsResponse = await axios.get('http://127.0.0.1:8000/api/specials');
      setRecipes(recipesResponse.data);
      setAllSpecials(specialsResponse.data);
    } catch (error) { console.error("Error fetching data!", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInitialData(); }, []);
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
      <div className="page-header"><h1>All Generated Recipes</h1></div>
      {loading ? <p>Loading recipes...</p> : (
        <RecipeList 
          recipes={recipes}
          allSpecials={allSpecials}
          onSelect={handleSelectRecipe}
          onDelete={handleDeleteRecipe}
          selectedRecipes={selectedRecipes}
        />
      )}
    </div>
  );
};

export default AllRecipesPage;