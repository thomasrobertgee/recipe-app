// src/components/RecipeDashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import RecipeCard from './RecipeCard';
import RecipeDetail from './RecipeDetail';
import ShoppingList from './ShoppingList';

const RecipeDashboard = () => {
  const [recipes, setRecipes] = useState([]);
  const [allSpecials, setAllSpecials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedRecipes, setSelectedRecipes] = useState(() => {
    const saved = localStorage.getItem('selectedRecipes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const recipesResponse = await axios.get('http://127.0.0.1:8000/api/recipes');
        const specialsResponse = await axios.get('http://127.0.0.1:8000/api/specials');
        setRecipes(recipesResponse.data);
        setAllSpecials(specialsResponse.data);
      } catch (error) {
        console.error("There was an error fetching initial data!", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes));
  }, [selectedRecipes]);

  const handleSelectRecipe = (recipeToToggle) => {
    if (selectedRecipes.find(r => r.id === recipeToToggle.id)) {
      setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeToToggle.id));
      toast.info(`"${recipeToToggle.title}" removed from your list.`);
    } else {
      setSelectedRecipes([...selectedRecipes, recipeToToggle]);
      toast.success(`"${recipeToToggle.title}" added to your list!`);
    }
  };

  const handleClearRecipes = () => {
    if (window.confirm("Are you sure you want to delete all recipes? This cannot be undone.")) {
      axios.delete('http://127.0.0.1:8000/api/recipes')
        .then(() => {
          setRecipes([]);
          setSelectedRecipes([]);
          toast.success("All recipes have been cleared.");
        })
        .catch(error => {
            console.error("Error clearing recipes:", error)
            toast.error("Could not clear recipes.");
        });
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
      .catch(error => {
        console.error("Error deleting recipe:", error)
        toast.error("Could not delete recipe.");
      });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Weekly Recipes</h1>
        <button onClick={handleClearRecipes} className="clear-all-btn">Clear All Recipes</button>
      </div>
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
                  onDelete={handleDeleteRecipe}
                />
              );
            })
          )}
        </div>
        <div className="shopping-list-section">
          <ShoppingList selectedRecipes={selectedRecipes} allSpecials={allSpecials} />
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
};

export default RecipeDashboard;