// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    return (storedToken && storedToken !== 'null') ? storedToken : null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());
  const [selectedRecipes, setSelectedRecipes] = useState(() => JSON.parse(localStorage.getItem('selectedRecipes') || '[]'));
  const [userProfile, setUserProfile] = useState(null);
  
  const [removedItems, setRemovedItems] = useState(() => JSON.parse(localStorage.getItem('removedItems') || '[]'));

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const [savedRecipesRes, userProfileRes] = await Promise.all([
            axios.get('http://127.0.0.1:8000/api/users/me/saved-recipes'),
            axios.get('http://127.0.0.1:8000/users/me')
          ]);
          setSavedRecipeIds(new Set(savedRecipesRes.data.map(recipe => recipe.id)));
          setUserProfile(userProfileRes.data);
        } catch (error) { 
          console.error("Could not fetch initial user data", error);
          if (error.response && error.response.status === 401) {
            setToken(null);
            setUserProfile(null);
          }
        }
      } else {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setSavedRecipeIds(new Set());
        setUserProfile(null);
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [token]);
  
  useEffect(() => {
    localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes));
  }, [selectedRecipes]);

  useEffect(() => {
    localStorage.setItem('removedItems', JSON.stringify(removedItems));
  }, [removedItems]);


  const login = (newToken) => setToken(newToken);
  const logout = () => { 
    setToken(null); 
    setSelectedRecipes([]); 
    setUserProfile(null);
    setRemovedItems([]);
  };
  
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
    const isAlreadySelected = selectedRecipes.some(r => r.id === recipeToToggle.id);

    if (isAlreadySelected) {
      const recipeItemIds = recipeToToggle.ingredients.map(ing => `${ing.name}-${recipeToToggle.id}`);
      setRemovedItems(prev => prev.filter(id => !recipeItemIds.includes(id)));
      setSelectedRecipes(prev => prev.filter(r => r.id !== recipeToToggle.id));
      toast.info(`"${recipeToToggle.title}" removed from your list.`);
    } else {
      setSelectedRecipes(prev => [...prev, recipeToToggle]);
      toast.success(`"${recipeToToggle.title}" added to your list!`);
    }
  };

  const handleRemoveShoppingListItem = (itemId) => {
    setRemovedItems(prev => [...prev, itemId]);
  };
  
  const handleAddShoppingListItem = (itemId) => {
    setRemovedItems(prev => prev.filter(id => id !== itemId));
  };


  const contextValue = { 
    token, 
    isLoading, 
    login, 
    logout, 
    savedRecipeIds, 
    saveRecipe, 
    unsaveRecipe, 
    selectedRecipes, 
    handleSelectRecipe,
    userProfile,
    setUserProfile,
    removedItems,
    handleRemoveShoppingListItem,
    handleAddShoppingListItem
  };

  return (<AuthContext.Provider value={contextValue}>{!isLoading && children}</AuthContext.Provider>);
};