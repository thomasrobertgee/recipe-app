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

    const [selectedRecipes, setSelectedRecipes] = useState(() => {
        try {
            const saved = localStorage.getItem('selectedRecipes');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Failed to parse selected recipes from localStorage", error);
            return [];
        }
    });

    const [savedRecipes, setSavedRecipes] = useState([]);
    const [pantryItems, setPantryItems] = useState([]);
    const pantryIdSet = useMemo(() => new Set(pantryItems.map(item => item.ingredient_id)), [pantryItems]);

    const navigate = useNavigate();
    const { openSidebar } = useUI();

    useEffect(() => {
        localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes));
    }, [selectedRecipes]);

    const savedRecipeIds = useMemo(() => {
        return new Set(savedRecipes.map(recipe => recipe.id));
    }, [savedRecipes]);

    const fetchPantryItems = useCallback(async () => {
        if (!localStorage.getItem('token')) {
            setPantryItems([]);
            return;
        }
        try {
            const res = await axios.get('/api/pantry');
            setPantryItems(res.data);
        } catch (error) {
            console.error("Error fetching pantry items:", error);
            if (error.response?.status !== 401) {
                toast.error("Could not load pantry items.");
            }
            setPantryItems([]);
        }
    }, []);

    const fetchSavedRecipes = useCallback(async () => {
        if (!localStorage.getItem('token')) {
            setSavedRecipes([]);
            return;
        }
        try {
            const res = await axios.get('/api/users/me/saved-recipes');
            setSavedRecipes(res.data);
        } catch (error) {
            console.error("Error fetching saved recipes:", error);
            if (error.response?.status !== 401) {
                toast.error("Could not load saved recipes.");
            }
            setSavedRecipes([]);
        }
    }, []);

    const fetchUserProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/users/me');
            setUserProfile(res.data);
            if (res.data) {
                 await fetchSavedRecipes();
                 await fetchPantryItems();
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            if (error.response && error.response.status === 401) {
                setToken(null);
                setUserProfile(null);
                setSavedRecipes([]);
                setSelectedRecipes([]);
                setPantryItems([]);
                localStorage.removeItem('token');
                localStorage.removeItem('selectedRecipes');
                delete axios.defaults.headers.common['Authorization'];
                toast.info("Session expired. Please log in again.");
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    }, [fetchSavedRecipes, fetchPantryItems, navigate]);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUserProfile();
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setIsLoading(false);
            setSavedRecipes([]);
            setUserProfile(null);
            setPantryItems([]);
        }
    }, [token, fetchUserProfile]);

    // --- REMOVED Notification polling useEffect ---

    const login = async (email, password) => {
        // ... (login function remains the same)
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

            await fetchUserProfile();

            // Use a temporary variable to check the role immediately after fetching
            let fetchedUserRole = null;
             try {
                 const profileRes = await axios.get('/users/me');
                 fetchedUserRole = profileRes.data.role;
             } catch (profileError) {
                 console.error("Failed to fetch profile immediately after login:", profileError);
             }


            if (fetchedUserRole === 'supplier') {
                navigate('/portal/dashboard');
                toast.success("Supplier login successful!");
            } else {
                navigate('/dashboard');
                toast.success("Login successful!");
            }

        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.response?.data?.detail || "Login failed");
        } finally {
             setIsLoading(false); // Ensure loading is stopped
        }
    };

    const loginWithGoogle = async (credentialResponse) => {
        // ... (loginWithGoogle function remains the same)
        setIsLoading(true);
        try {
            const res = await axios.post('/api/auth/google', {
                token: credentialResponse.credential
            });

            const newToken = res.data.access_token;
            setToken(newToken);
            localStorage.setItem('token', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            await fetchUserProfile(); // Fetches profile, saved recipes, and pantry

             // Use a temporary variable to check the role immediately after fetching
             let fetchedUserRole = null;
             try {
                 const profileRes = await axios.get('/users/me');
                 fetchedUserRole = profileRes.data.role;
             } catch (profileError) {
                 console.error("Failed to fetch profile immediately after Google login:", profileError);
             }


            if (fetchedUserRole === 'supplier') {
                navigate('/portal/dashboard');
                toast.success("Supplier Google login successful!");
            } else {
                navigate('/dashboard');
                toast.success("Google login successful!");
            }

        } catch (error) {
            console.error("Google login error:", error);
            toast.error(error.response?.data?.detail || "Google login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        // ... (logout function remains the same)
        setToken(null);
        setUserProfile(null);
        setSavedRecipes([]);
        setSelectedRecipes([]);
        setPantryItems([]);
        localStorage.removeItem('token');
        localStorage.removeItem('selectedRecipes');
        delete axios.defaults.headers.common['Authorization'];
        navigate('/');
        toast.info("You have been logged out.");
    };

    const handleSelectRecipe = (recipe) => {
        // ... (handleSelectRecipe function remains the same)
         setSelectedRecipes(prevSelected => {
             const existingIndex = prevSelected.findIndex(item => item.recipe.id === recipe.id);
             if (existingIndex > -1) {
                 return prevSelected.filter(item => item.recipe.id !== recipe.id);
             } else {
                 openSidebar();
                 return [...prevSelected, { recipe: recipe, quantity: 1 }];
             }
         });
     };

      const incrementRecipeQuantity = (recipeId) => {
        // ... (increment function remains the same)
          setSelectedRecipes(prevSelected =>
              prevSelected.map(item =>
                  item.recipe.id === recipeId
                      ? { ...item, quantity: item.quantity + 1 }
                      : item
              )
          );
      };

      const decrementRecipeQuantity = (recipeId) => {
        // ... (decrement function remains the same)
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
        // ... (saveRecipe function remains the same)
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
        // ... (unsaveRecipe function remains the same)
        try {
            await axios.delete(`/api/users/me/saved-recipes/${recipeId}`);
            setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
            toast.info("Recipe removed from saved.");
        } catch (error) {
            console.error("Error unsaving recipe:", error);
            toast.error("Could not unsave recipe.");
        }
    };

    const clearShoppingList = () => {
        // ... (clearShoppingList function remains the same)
        setSelectedRecipes([]);
    };

    const removeIngredientFromList = (ingredientIdToRemove) => {
        // ... (removeIngredientFromList function remains the same)
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
            return prev;
        });
    };

    const addPantryItem = useCallback(async (itemName) => {
        // ... (addPantryItem function remains the same)
        const trimmedItemName = itemName.trim();
        if (pantryItems.some(item => item.name.toLowerCase() === trimmedItemName.toLowerCase())) {
            toast.info(`"${trimmedItemName}" is already in your pantry.`);
            return null;
        }

        const optimisticItem = { ingredient_id: Date.now(), name: trimmedItemName, category: 'Unknown' };
        setPantryItems(prev => [...prev, optimisticItem].sort((a, b) => a.name.localeCompare(b.name)));

        try {
            const res = await axios.post('/api/pantry', { ingredient_name: trimmedItemName });
            setPantryItems(prev => prev.map(item => item.ingredient_id === optimisticItem.ingredient_id ? res.data : item)
                .sort((a, b) => a.name.localeCompare(b.name)));
            toast.success(`"${trimmedItemName}" added to pantry!`);
            return res.data;
        } catch (error) {
            console.error("Error adding item:", error);
            toast.error(`Failed to add "${trimmedItemName}". ${error.response?.data?.detail || ''}`);
            setPantryItems(prev => prev.filter(item => item.ingredient_id !== optimisticItem.ingredient_id));
            return null;
        }
    }, [pantryItems]);

    const removePantryItem = useCallback(async (itemId, itemName) => {
        // ... (removePantryItem function remains the same)
        setPantryItems(prev => prev.filter(item => item.ingredient_id !== itemId));
        try {
            await axios.delete(`/api/pantry/${itemId}`);
            toast.info(`"${itemName}" removed from pantry.`);
        } catch (error) {
            console.error("Error removing item:", error);
            toast.error(`Failed to remove "${itemName}".`);
            fetchPantryItems();
        }
    }, [fetchPantryItems]);

    return (
        <AuthContext.Provider value={{
            token, userProfile, user: userProfile, isLoading, loading: isLoading,
            login, loginWithGoogle, logout, fetchUserProfile,
            selectedRecipes, handleSelectRecipe, incrementRecipeQuantity, decrementRecipeQuantity,
            savedRecipes, savedRecipeIds, saveRecipe, unsaveRecipe, fetchSavedRecipes,
            clearShoppingList, removeIngredientFromList,
            pantryItems, pantryIdSet, addPantryItem, removePantryItem, fetchPantryItems
        }}>
            {children}
        </AuthContext.Provider>
    );
};