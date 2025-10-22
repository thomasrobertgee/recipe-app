// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useUI } from './UIContext';

const AuthContext = createContext();

// --- Set Axios base URL ---
// Make sure this matches your backend IP if testing on mobile
axios.defaults.baseURL = 'http://192.168.1.102:8000'; // Your current setting

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- FIX: Initialize selectedRecipes from localStorage ---
    const [selectedRecipes, setSelectedRecipes] = useState(() => {
        try {
            const saved = localStorage.getItem('selectedRecipes');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Failed to parse selected recipes from localStorage", error);
            return [];
        }
    });

    const [savedRecipes, setSavedRecipes] = useState([]); // Array of recipe objects
    const navigate = useNavigate();
    const { openSidebar } = useUI();

    // --- FIX: Persist selectedRecipes to localStorage on change ---
    useEffect(() => {
        localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes));
    }, [selectedRecipes]);

    const savedRecipeIds = useMemo(() => {
        return new Set(savedRecipes.map(recipe => recipe.id));
    }, [savedRecipes]);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUserProfile();
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setIsLoading(false);
        }
    }, [token]);

    const fetchUserProfile = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/users/me');
            setUserProfile(res.data);
            if (res.data) {
                 await fetchSavedRecipes();
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            if (error.response && error.response.status === 401) {
                setToken(null);
                setUserProfile(null);
                setSavedRecipes([]);
                setSelectedRecipes([]);
                localStorage.removeItem('token');
                localStorage.removeItem('selectedRecipes');
                delete axios.defaults.headers.common['Authorization'];
                toast.info("Session expired. Please log in again.");
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSavedRecipes = async () => {
        try {
            const res = await axios.get('/api/users/me/saved-recipes');
            setSavedRecipes(res.data);
        } catch (error) {
            console.error("Error fetching saved recipes:", error);
            toast.error("Could not load saved recipes.");
            setSavedRecipes([]);
        }
    };

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await axios.post('/token', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const newToken = res.data.access_token;
            setToken(newToken);
            localStorage.setItem('token', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            const userRes = await axios.get('/users/me');
            const fetchedUser = userRes.data;
            setUserProfile(fetchedUser);

            await fetchSavedRecipes();

            setIsLoading(false);
            if (fetchedUser.role === 'supplier') {
                navigate('/portal/dashboard');
                toast.success("Supplier login successful!");
            } else {
                navigate('/dashboard');
                toast.success("Login successful!");
            }

        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.response?.data?.detail || "Login failed");
            setIsLoading(false);
        }
    };

    const loginWithGoogle = async (credentialResponse) => {
        setIsLoading(true);
        try {
            const res = await axios.post('/api/auth/google', {
                token: credentialResponse.credential
            });

            const newToken = res.data.access_token;
            setToken(newToken);
            localStorage.setItem('token', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            const userRes = await axios.get('/users/me');
            const fetchedUser = userRes.data;
            setUserProfile(fetchedUser);

            await fetchSavedRecipes();

            setIsLoading(false);
             if (fetchedUser.role === 'supplier') {
                 navigate('/portal/dashboard');
                 toast.success("Supplier Google login successful!");
            } else {
                 navigate('/dashboard');
                 toast.success("Google login successful!");
            }

        } catch (error) {
            console.error("Google login error:", error);
            toast.error(error.response?.data?.detail || "Google login failed");
            setIsLoading(false);
        }
    };

    const logout = () => {
        setToken(null);
        setUserProfile(null);
        setSavedRecipes([]);
        setSelectedRecipes([]);
        localStorage.removeItem('token');
        localStorage.removeItem('selectedRecipes'); // --- FIX: Ensure this is cleared on logout ---
        delete axios.defaults.headers.common['Authorization'];
        navigate('/');
        toast.info("You have been logged out.");
    };

    const handleSelectRecipe = (recipe) => {
         setSelectedRecipes(prevSelected => {
             const existingIndex = prevSelected.findIndex(item => item.recipe.id === recipe.id);
             if (existingIndex > -1) {
                 // This logic removes the item if clicked again. If you want to increment instead, change this.
                 return prevSelected.filter(item => item.recipe.id !== recipe.id);
             } else {
                 openSidebar();
                 return [...prevSelected, { recipe: recipe, quantity: 1 }];
             }
         });
     };

      const incrementRecipeQuantity = (recipeId) => {
          setSelectedRecipes(prevSelected =>
              prevSelected.map(item =>
                  item.recipe.id === recipeId
                      ? { ...item, quantity: item.quantity + 1 }
                      : item
              )
          );
      };

      const decrementRecipeQuantity = (recipeId) => {
          setSelectedRecipes(prevSelected => {
              const itemToUpdate = prevSelected.find(item => item.recipe.id === recipeId);
              if (itemToUpdate && itemToUpdate.quantity > 1) {
                  return prevSelected.map(item =>
                      item.recipe.id === recipeId
                          ? { ...item, quantity: item.quantity - 1 }
                          : item
                  );
              } else {
                  return prevSelected.filter(item => item.recipe.id !== recipeId);
              }
          });
      };

    const saveRecipe = async (recipe) => {
        if (savedRecipeIds.has(recipe.id)) {
             toast.info("Recipe already saved.");
             return;
        }
        try {
            await axios.post(`/api/users/me/saved-recipes/${recipe.id}`);
            setSavedRecipes(prev => [...prev, recipe]);
            toast.success("Recipe saved!");
        } catch (error) {
            console.error("Error saving recipe:", error);
            toast.error("Could not save recipe.");
        }
    };

    const unsaveRecipe = async (recipeId) => {
        try {
            await axios.delete(`/api/users/me/saved-recipes/${recipeId}`);
            setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
            toast.info("Recipe removed from saved.");
        } catch (error) {
            console.error("Error unsaving recipe:", error);
            toast.error("Could not unsave recipe.");
        }
    };

    // --- FIX: Correctly clear the shopping list ---
    const clearShoppingList = () => {
        setSelectedRecipes([]);
    };

    // --- FIX: Add new function to remove a single ingredient ---
    const removeIngredientFromList = (ingredientIdToRemove) => {
        setSelectedRecipes(prev => {
            const newSelectedRecipes = prev.map(selection => {
                const isIngredientInRecipe = selection.recipe.ingredients.some(ing => ing.ingredient_id === ingredientIdToRemove);
                if (isIngredientInRecipe) {
                    const updatedRecipe = {
                        ...selection.recipe,
                        ingredients: selection.recipe.ingredients.filter(ing => ing.ingredient_id !== ingredientIdToRemove)
                    };
                    if (updatedRecipe.ingredients.length === 0) {
                        return null;
                    }
                    return { ...selection, recipe: updatedRecipe };
                }
                return selection;
            }).filter(Boolean);
            return newSelectedRecipes;
        });
    };

    return (
        <AuthContext.Provider value={{
            token,
            userProfile,
            user: userProfile,
            isLoading,
            loading: isLoading,
            login,
            loginWithGoogle,
            logout,
            fetchUserProfile,
            selectedRecipes,
            handleSelectRecipe,
            savedRecipes,
            savedRecipeIds,
            saveRecipe,
            unsaveRecipe,
            fetchSavedRecipes,
            incrementRecipeQuantity,
            decrementRecipeQuantity,
            // --- FIX: Expose the new functions ---
            clearShoppingList,
            removeIngredientFromList
        }}>
            {children}
        </AuthContext.Provider>
    );
};
