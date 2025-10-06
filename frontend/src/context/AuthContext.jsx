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
  
  const [selectedRecipes, setSelectedRecipes] = useState(() => {
    try {
      const storedData = JSON.parse(localStorage.getItem('selectedRecipes') || '[]');
      if (Array.isArray(storedData)) {
        if (storedData.length > 0 && storedData[0] && typeof storedData[0].recipe === 'undefined') {
          return storedData.map(recipe => ({ recipe: recipe, quantity: 1 }));
        }
        return storedData;
      }
      return [];
    } catch (error) {
      console.error("Error parsing selected recipes from localStorage", error);
      return [];
    }
  });

  const [userProfile, setUserProfile] = useState(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());
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
  
  const handleSelectRecipe = (recipeToAdd) => {
    const isAlreadySelected = selectedRecipes.some(item => item.recipe.id === recipeToAdd.id);
    if (isAlreadySelected) {
        setSelectedRecipes(prev => prev.filter(item => item.recipe.id !== recipeToAdd.id));
        toast.info(`"${recipeToAdd.title}" removed from your list.`);
    } else {
        setSelectedRecipes(prev => [...prev, { recipe: recipeToAdd, quantity: 1 }]);
        toast.success(`"${recipeToAdd.title}" added to your list!`);
    }
  };

  const incrementRecipeQuantity = (recipeId) => {
    setSelectedRecipes(prev =>
        prev.map(item =>
            item.recipe.id === recipeId
                ? { ...item, quantity: item.quantity + 1 }
                : item
        )
    );
  };

  const decrementRecipeQuantity = (recipeId) => {
      const existingItem = selectedRecipes.find(item => item.recipe.id === recipeId);
      if (existingItem && existingItem.quantity > 1) {
          setSelectedRecipes(prev => prev.map(item =>
              item.recipe.id === recipeId
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
          ));
      } else {
          if (existingItem) {
            toast.info(`"${existingItem.recipe.title}" removed from your list.`);
          }
          setSelectedRecipes(prev => prev.filter(item => item.recipe.id !== recipeId));
      }
  };

  const handleRemoveShoppingListItem = (itemId) => {
    setRemovedItems(prev => [...prev, itemId]);
  };
  
  const handleAddShoppingListItem = (itemId) => {
    setRemovedItems(prev => prev.filter(id => id !== itemId));
  };
  
  const clearShoppingList = () => {
    setSelectedRecipes([]);
    setRemovedItems([]);
    toast.info("Shopping list cleared.");
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
    handleAddShoppingListItem,
    incrementRecipeQuantity,
    decrementRecipeQuantity,
    clearShoppingList
  };

  return (<AuthContext.Provider value={contextValue}>{!isLoading && children}</AuthContext.Provider>);
};