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

    // --- *** BUG FIX: Wrap fetchSavedRecipes in useCallback *** ---
    const fetchSavedRecipes = useCallback(async () => {
        // Only fetch if a token exists, otherwise clear saved recipes
        if (!localStorage.getItem('token')) {
            setSavedRecipes([]);
            return;
        }
        try {
            const res = await axios.get('/api/users/me/saved-recipes');
            setSavedRecipes(res.data);
        } catch (error) {
            console.error("Error fetching saved recipes:", error);
            // Don't toast error here if it's due to 401, as fetchUserProfile handles that
            if (error.response?.status !== 401) {
                toast.error("Could not load saved recipes.");
            }
            setSavedRecipes([]); // Clear recipes on error
        }
    // No dependencies needed as it relies on the token implicitly handled by axios interceptors/headers
    }, []); 
    // --- *** END BUG FIX *** ---

    // --- *** BUG FIX: Wrap fetchUserProfile in useCallback *** ---
    // Although not directly causing this bug, it's good practice
    const fetchUserProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/users/me');
            setUserProfile(res.data);
            if (res.data) {
                 // Call the memoized fetchSavedRecipes
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
    // Dependency on fetchSavedRecipes ensures it uses the correct memoized version
    }, [fetchSavedRecipes, navigate]); 
    // --- *** END BUG FIX *** ---

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUserProfile();
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setIsLoading(false);
             // --- Ensure saved recipes are cleared if token is removed ---
            setSavedRecipes([]); 
            setUserProfile(null);
        }
    // fetchUserProfile is now memoized, safe to include
    }, [token, fetchUserProfile]); 


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
            
            // fetchUserProfile will handle setting user and fetching saved recipes
            await fetchUserProfile(); 
            
            // Navigate based on fetched profile role
            const fetchedUser = userProfile; // Use state updated by fetchUserProfile

            // Add a small delay or check isLoading to ensure userProfile is set before navigating
            if (!isLoading && fetchedUser) {
                if (fetchedUser.role === 'supplier') {
                    navigate('/portal/dashboard');
                    toast.success("Supplier login successful!");
                } else {
                    navigate('/dashboard');
                    toast.success("Login successful!");
                }
            } else {
                 // Fallback or handle loading state if navigation depends heavily on immediate profile data
                 // For now, let's assume fetchUserProfile finishes quickly enough
                 console.warn("User profile still loading after login attempt...");
                 // Basic fallback
                 navigate('/dashboard');
                 toast.success("Login successful!");
            }


        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.response?.data?.detail || "Login failed");
            setIsLoading(false); // Ensure loading is stopped on error
        } 
        // finally block might run too early before async navigation completes
        // setIsLoading(false); // Moved inside try/catch blocks
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

            await fetchUserProfile(); // Fetches profile and saved recipes

            const fetchedUser = userProfile; // Use state updated by fetchUserProfile
             
            if (!isLoading && fetchedUser) {
                 if (fetchedUser.role === 'supplier') {
                     navigate('/portal/dashboard');
                     toast.success("Supplier Google login successful!");
                } else {
                     navigate('/dashboard');
                     toast.success("Google login successful!");
                }
            } else {
                 console.warn("User profile still loading after Google login attempt...");
                 navigate('/dashboard'); // Basic fallback
                 toast.success("Google login successful!");
            }

        } catch (error) {
            console.error("Google login error:", error);
            toast.error(error.response?.data?.detail || "Google login failed");
            setIsLoading(false); // Ensure loading is stopped on error
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
                  // Remove the item if quantity drops to 0 or less
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
            // Use the functional update form of setState to ensure we have the latest state
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
    // Ensure removeIngredientFromList works on the global selectedRecipes
    const removeIngredientFromList = (ingredientIdToRemove) => {
        // This logic seems overly complex for just removing an ingredient globally.
        // Let's simplify: Find recipes containing the ingredient and remove them entirely from the global list.
        // A more nuanced approach would involve modifying the recipes *within* the state,
        // but removing the whole recipe selection is simpler for now.
        
        setSelectedRecipes(prev => {
            const recipesToRemove = new Set();
            prev.forEach(selection => {
                if (selection.recipe.ingredients.some(ing => ing.ingredient_id === ingredientIdToRemove)) {
                    recipesToRemove.add(selection.recipe.id);
                }
            });
            
            if (recipesToRemove.size > 0) {
                 const updatedList = prev.filter(selection => !recipesToRemove.has(selection.recipe.id));
                 toast.info(`Removed recipes containing the ingredient from the shopping list.`);
                 return updatedList;
            }
            return prev; // No change needed
        });
    };

    return (
        <AuthContext.Provider value={{
            token,
            userProfile,
            user: userProfile, // Keep alias if used elsewhere
            isLoading,
            loading: isLoading, // Keep alias if used elsewhere
            login,
            loginWithGoogle,
            logout,
            fetchUserProfile, // Expose memoized version
            selectedRecipes,
            handleSelectRecipe,
            savedRecipes,
            savedRecipeIds,
            saveRecipe,
            unsaveRecipe,
            fetchSavedRecipes, // Expose memoized version
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