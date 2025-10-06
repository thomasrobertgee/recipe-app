// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // --- THIS IS THE FIX ---
  // This function now properly checks for 'null' as a string.
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    return (storedToken && storedToken !== 'null') ? storedToken : null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());
  const [selectedRecipes, setSelectedRecipes] = useState(() => JSON.parse(localStorage.getItem('selectedRecipes') || '[]'));

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await axios.get('http://127.0.0.1:8000/api/users/me/saved-recipes');
          setSavedRecipeIds(new Set(response.data.map(recipe => recipe.id)));
        } catch (error) { console.error("Could not fetch saved recipes", error); }
      } else {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setSavedRecipeIds(new Set());
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [token]);
  
  useEffect(() => {
    localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes));
  }, [selectedRecipes]);

  const login = (newToken) => setToken(newToken);
  const logout = () => { setToken(null); setSelectedRecipes([]); };
  
  const saveRecipe = async (recipeId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/api/users/me/saved-recipes/${recipeId}`);
      setSavedRecipeIds(prevIds => new Set(prevIds).add(recipeId));
      toast.success("Recipe saved!");
    } catch (error) { console.error("Error saving recipe:", error); toast.error("Could not save recipe."); }
  };

  const unsaveRecipe = async (recipeId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/users/me/saved-recipes/${recipeId}`);
      setSavedRecipeIds(prevIds => { const newIds = new Set(prevIds); newIds.delete(recipeId); return newIds; });
      toast.info("Recipe unsaved.");
    } catch (error) { console.error("Error unsaving recipe:", error); toast.error("Could not unsave recipe."); }
  };
  
  const handleSelectRecipe = (recipeToToggle) => {
    const isSelected = selectedRecipes.find(r => r.id === recipeToToggle.id);
    if (isSelected) {
      setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeToToggle.id));
      toast.info(`"${recipeToToggle.title}" removed from your list.`);
    } else {
      setSelectedRecipes([...selectedRecipes, recipeToToggle]);
      toast.success(`"${recipeToToggle.title}" added to your list!`);
    }
  };

  const contextValue = { token, isLoading, login, logout, savedRecipeIds, saveRecipe, unsaveRecipe, selectedRecipes, handleSelectRecipe };

  return (<AuthContext.Provider value={contextValue}>{!isLoading && children}</AuthContext.Provider>);
};