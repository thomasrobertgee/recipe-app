// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await axios.get('http://127.0.0.1:8000/api/users/me/saved-recipes');
          const ids = response.data.map(recipe => recipe.id);
          setSavedRecipeIds(new Set(ids));
        } catch (error) {
          console.error("Could not fetch saved recipes", error);
        }
      } else {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setSavedRecipeIds(new Set());
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [token]);

  const login = (newToken) => { setToken(newToken); };
  const logout = () => { setToken(null); };

  const saveRecipe = async (recipeId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/api/users/me/saved-recipes/${recipeId}`);
      setSavedRecipeIds(prevIds => new Set(prevIds).add(recipeId));
      toast.success("Recipe saved!");
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Could not save recipe.");
    }
  };

  const unsaveRecipe = async (recipeId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/users/me/saved-recipes/${recipeId}`);
      setSavedRecipeIds(prevIds => {
        const newIds = new Set(prevIds);
        newIds.delete(recipeId);
        return newIds;
      });
      toast.info("Recipe unsaved.");
    } catch (error) {
      console.error("Error unsaving recipe:", error);
      toast.error("Could not unsave recipe.");
    }
  };

  const contextValue = { token, isLoading, login, logout, savedRecipeIds, saveRecipe, unsaveRecipe };

  return (
    <AuthContext.Provider value={contextValue}>
      {/* --- THIS IS THE FIX: Corrected the closing tag --- */}
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};