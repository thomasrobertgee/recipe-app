// src/pages/AllRecipesPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import RecipeList from '../components/RecipeList';
import FilterSortControls from '../components/FilterSortControls';
// --- Import Page CSS if needed for header ---
import './Page.css';

const AllRecipesPage = ({ allSpecials }) => {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { handleSelectRecipe, selectedRecipes } = useAuth(); // Assuming selectedRecipes comes from context for RecipeCard's 'isSelected' prop
    const [minRating, setMinRating] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [allAvailableTags, setAllAvailableTags] = useState([]);

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
            .then(res => setRecipes(res.data)) // Set the fetched recipes
            .catch(err => {
                console.error("Error fetching recipes!", err);
                toast.error("Could not load recipes."); // Add toast on error
            })
            .finally(() => setLoading(false));
    };

    // Fetch recipes when filters change
    useEffect(() => { fetchRecipes(); }, [minRating, sortBy, selectedTags]);

    const handleDeleteRecipe = (recipeId) => {
        axios.delete(`http://127.0.0.1:8000/api/recipes/${recipeId}`)
            .then(() => {
                const deletedRecipe = recipes.find(r => r.id === recipeId);
                toast.success(`"${deletedRecipe?.title || 'Recipe'}" was deleted.`); // Safely access title
                // Update state locally instead of full refetch
                setRecipes(prevRecipes => prevRecipes.filter(r => r.id !== recipeId));
            })
            .catch(error => {
                console.error("Error deleting recipe:", error);
                toast.error("Could not delete recipe."); // Add toast on error
             });
    };

    // --- *** FIX: Update handleRateRecipe to update state locally *** ---
    const handleRateRecipe = (recipeId, rating) => {
        axios.post(`http://127.0.0.1:8000/api/recipes/${recipeId}/rate`, { rating })
            .then((response) => { // Expect the updated recipe object in response.data
                const updatedRecipe = response.data;
                toast.success("Recipe rated!");

                // Update the specific recipe in the local state
                setRecipes(prevRecipes =>
                    prevRecipes.map(recipe =>
                        recipe.id === recipeId ? updatedRecipe : recipe
                    )
                );
                // --- No longer need fetchRecipes() here ---
                // fetchRecipes();
            })
            .catch(error => {
                console.error("Error rating recipe:", error);
                toast.error("Could not rate recipe.");
            });
    };
    // --- *** END FIX *** ---

    const handleTagClick = (tag) => {
        setSelectedTags(prevTags =>
            prevTags.includes(tag)
                ? prevTags.filter(t => t !== tag)
                : [...prevTags, tag]
        );
    };

    return (
        <div className="app-container">
            {/* Use page-header for consistency */}
            <div className="page-header"><h1>All Recipes</h1></div>
            <FilterSortControls
                minRating={minRating}
                setMinRating={setMinRating}
                sortBy={sortBy}
                setSortBy={setSortBy}
                availableTags={allAvailableTags}
                selectedTags={selectedTags}
                handleTagClick={handleTagClick}
            />
            {loading ? <p>Loading recipes...</p> : (
                <RecipeList
                    recipes={recipes}
                    allSpecials={allSpecials}
                    onDelete={handleDeleteRecipe} // Pass delete handler
                    onRate={handleRateRecipe}   // Pass rate handler
                    // Pass select handler and selected state if RecipeList uses them
                    // onSelect={handleSelectRecipe}
                    // selectedRecipes={selectedRecipes} // Assuming selectedRecipes is needed by RecipeCard via RecipeList
                />
            )}
        </div>
    );
};

export default AllRecipesPage;