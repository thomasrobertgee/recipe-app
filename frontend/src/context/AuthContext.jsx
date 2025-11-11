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

    const [selectedSpecials, setSelectedSpecials] = useState(() => {
        try {
            const saved = localStorage.getItem('selectedSpecials');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Failed to parse selected specials from localStorage", error);
            return [];
        }
    });

    const [savedRecipes, setSavedRecipes] = useState([]);
    const [pantryItems, setPantryItems] = useState([]);
    // --- NEW: State for followed suppliers ---
    const [followedSupplierIds, setFollowedSupplierIds] = useState(new Set());
    // --- END NEW ---

    const pantryIdSet = useMemo(() => new Set(pantryItems.map(item => item.ingredient_id)), [pantryItems]);

    const navigate = useNavigate();
    const { openSidebar } = useUI();

    useEffect(() => {
        localStorage.setItem('selectedRecipes', JSON.stringify(selectedRecipes));
    }, [selectedRecipes]);

    useEffect(() => {
        localStorage.setItem('selectedSpecials', JSON.stringify(selectedSpecials));
    }, [selectedSpecials]);

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

    // --- NEW: Fetch followed suppliers ---
    const fetchFollowedSuppliers = useCallback(async () => {
        if (!localStorage.getItem('token')) {
            setFollowedSupplierIds(new Set());
            return;
        }
        try {
            const res = await axios.get('/api/users/me/followed-suppliers');
            setFollowedSupplierIds(new Set(res.data)); // res.data is a list of IDs
        } catch (error) {
            console.error("Error fetching followed suppliers:", error);
            // --- FIX: Removed toast notification ---
            // if (error.response?.status !== 401) {
            //     toast.error("Could not load followed suppliers.");
            // }
            // --- END FIX ---
            setFollowedSupplierIds(new Set());
        }
    }, []);
    // --- END NEW ---

    const fetchUserProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/users/me');
            setUserProfile(res.data);
            if (res.data) {
                await fetchSavedRecipes();
                await fetchPantryItems();
                await fetchFollowedSuppliers(); // <-- Called here
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            if (error.response && error.response.status === 401) {
                setToken(null);
                setUserProfile(null);
                setSavedRecipes([]);
                setSelectedRecipes([]);
                setPantryItems([]);
                setSelectedSpecials([]);
                setFollowedSupplierIds(new Set()); // <-- NEW
                localStorage.removeItem('token');
                localStorage.removeItem('selectedRecipes');
                localStorage.removeItem('selectedSpecials'); // <-- NEW
                delete axios.defaults.headers.common['Authorization'];
                toast.info("Session expired. Please log in again.");

                // --- SMART REDIRECT FIX (from previous step) ---
                if (window.location.pathname.startsWith('/portal')) {
                    navigate('/portal/login');
                } else {
                    navigate('/login');
                }
                // --- END FIX ---
            }
        } finally {
            setIsLoading(false);
        }
    }, [fetchSavedRecipes, fetchPantryItems, fetchFollowedSuppliers, navigate]); // <-- NEW

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUserProfile(); // <-- Called here
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setIsLoading(false);
            setSavedRecipes([]);
            setUserProfile(null);
            setPantryItems([]);
            setSelectedSpecials([]);
            setFollowedSupplierIds(new Set()); // <-- NEW
        }
    }, [token, fetchUserProfile]);

    // --- REMOVED Notification polling useEffect ---

    // --- NEW: loginWithToken (Correct from last step) ---
    const loginWithToken = async (accessToken) => {
        setIsLoading(true);
        try {
            // 1. Set the token
            setToken(accessToken);
            localStorage.setItem('token', accessToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            
            // 2. Fetch all user data
            await fetchUserProfile(); // This fetches profile, recipes, pantry, etc.

            // 3. Re-fetch user profile *just* to get the role for navigation
            let fetchedUserRole = null;
            try {
                const profileRes = await axios.get('/users/me');
                fetchedUserRole = profileRes.data.role;
            } catch (profileError) {
                console.error("Failed to fetch profile immediately after token login:", profileError);
            }

            // 4. Navigate based on role
            if (fetchedUserRole === 'supplier') {
                navigate('/portal/dashboard');
                toast.success("Welcome, Supplier!");
            } else {
                navigate('/dashboard');
                toast.success("Welcome!");
            }

        } catch (error) {
            console.error("Login with token error:", error);
            logout(); // Clear everything if something went wrong
        } finally {
            setIsLoading(false);
        }
    };
    // --- END NEW ---


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
            
            await loginWithToken(newToken); // Use loginWithToken

        } catch (error) {
            console.error("Login error:", error);
            toast.error(error.response?.data?.detail || "Login failed");
            setIsLoading(false); // Manually set loading false on error
        }
    };

    const loginWithGoogle = async (credentialResponse) => {
        setIsLoading(true);
        try {
            const res = await axios.post('/api/auth/google', {
                // --- *** THE FIX *** ---
                // We must pass the credential *string*, not the whole object
                token: credentialResponse.credential 
                // --- *** END FIX *** ---
            });

            const newToken = res.data.access_token;
            
            await loginWithToken(newToken); // Use loginWithToken

        } catch (error) {
            console.error("Google login error:", error);
            toast.error(error.response?.data?.detail || "Google login failed");
            setIsLoading(false); // Manually set loading false on error
        }
    };

    const logout = () => {
        // ... (logout function remains the same)
        setToken(null);
        setUserProfile(null);
        setSavedRecipes([]);
        setSelectedRecipes([]);
        setPantryItems([]);
        setSelectedSpecials([]);
        setFollowedSupplierIds(new Set()); // <-- NEW
        localStorage.removeItem('token');
        localStorage.removeItem('selectedRecipes');
        localStorage.removeItem('selectedSpecials');
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

    const handleSelectSpecial = (special) => {
        // ... (handleSelectSpecial function remains the same)
        if (!special || typeof special.id === 'undefined') {
            console.error("Invalid special object passed to handleSelectSpecial:", special);
            toast.error("Could not add item to list.");
            return;
        }

        setSelectedSpecials(prevSelected => {
            const existingIndex = prevSelected.findIndex(item => item.id === special.id);

            if (existingIndex > -1) {
                // Item exists, so remove it
                return prevSelected.filter(item => item.id !== special.id);
            } else {
                // Item does not exist, so add it
                openSidebar(); // Open sidebar when adding

                // Check if it's a supplier special (store is not Coles, Woolworths, Aldi)
                const supermarkets = ["Coles", "Woolworths", "Aldi"];
                if (!supermarkets.includes(special.store)) {
                    // It's a supplier special, track the save (fire-and-forget)
                    axios.post(`/api/prices/${special.id}/track-save`)
                        .then(() => console.log(`Tracked save for supplier special: ${special.id}`))
                        .catch(err => console.error(`Failed to track save for special ${special.id}:`, err));
                }

                // Add the special to the list
                return [...prevSelected, special];
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

    // --- NEW: Follow/Unfollow Handlers ---
    const followSupplier = useCallback(async (supplierId) => {
        try {
            await axios.post(`/api/supplier/${supplierId}/follow`);
            setFollowedSupplierIds(prev => new Set(prev).add(supplierId));
            toast.success("Supplier followed!");
        } catch (error) {
            console.error("Error following supplier:", error);
            toast.error(error.response?.data?.detail || "Could not follow supplier.");
        }
    }, []);

    const unfollowSupplier = useCallback(async (supplierId) => {
        try {
            await axios.delete(`/api/supplier/${supplierId}/follow`);
            setFollowedSupplierIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(supplierId);
                return newSet;
            });
            toast.info("Supplier unfollowed.");
        } catch (error) {
            console.error("Error unfollowing supplier:", error);
            toast.error(error.response?.data?.detail || "Could not unfollow supplier.");
        }
    }, []);
    // --- END NEW ---

    const clearShoppingList = () => {
        // ... (clearShoppingList function remains the same)
        setSelectedRecipes([]);
        setSelectedSpecials([]);
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
            login, loginWithGoogle, logout,
            
            loginWithToken, // <-- Function from last step

            // --- BUG FIX: Expose fetchUserProfile as refreshUserProfile ---
            refreshUserProfile: fetchUserProfile, // <--- THIS IS THE FIX

            selectedRecipes, handleSelectRecipe, incrementRecipeQuantity, decrementRecipeQuantity,

            selectedSpecials, handleSelectSpecial,

            savedRecipes, savedRecipeIds, saveRecipe, unsaveRecipe, fetchSavedRecipes,
            clearShoppingList, removeIngredientFromList,
            pantryItems, pantryIdSet, addPantryItem, removePantryItem, fetchPantryItems,

            // --- NEWLY EXPOSED ---
            followedSupplierIds, followSupplier, unfollowSupplier
            // --- END NEW ---
        }}>
            {children}
        </AuthContext.Provider>
    );
};