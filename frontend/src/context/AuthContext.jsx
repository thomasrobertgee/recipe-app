// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react'; // Import useMemo
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AuthContext = createContext();

// --- Set Axios base URL ---
// Make sure this matches your backend IP if testing on mobile
axios.defaults.baseURL = 'http://192.168.1.102:8000'; // Your current setting

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [savedRecipes, setSavedRecipes] = useState([]); // Array of recipe objects
    const navigate = useNavigate();

    // --- *** FIX PART 1: Create a Set of saved recipe IDs *** ---
    // useMemo will recalculate this Set only when savedRecipes array changes
    const savedRecipeIds = useMemo(() => {
        // Create a Set containing just the IDs from the savedRecipes array
        return new Set(savedRecipes.map(recipe => recipe.id));
    }, [savedRecipes]);
    // --- *** END FIX PART 1 *** ---

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUserProfile(); // This now implicitly handles fetching saved recipes too on load
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setIsLoading(false);
        }
    }, [token]);

    const fetchUserProfile = async () => {
        setIsLoading(true); // Ensure loading state is true while fetching
        try {
            const res = await axios.get('/users/me');
            setUserProfile(res.data);
            // Fetch saved recipes only *after* successfully getting the user profile
            if (res.data) { // Check if user data was actually fetched
                 await fetchSavedRecipes(); // Fetch recipes associated with this user
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            if (error.response && error.response.status === 401) {
                // Token is invalid/expired - Clear everything
                setToken(null);
                setUserProfile(null);
                setSavedRecipes([]);
                setSelectedRecipes([]);
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['Authorization'];
                toast.info("Session expired. Please log in again.");
                navigate('/login'); // Redirect to login
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSavedRecipes = async () => {
        // No need for separate loading state here, handled by fetchUserProfile
        try {
            const res = await axios.get('/api/users/me/saved-recipes');
            setSavedRecipes(res.data); // This update will trigger the useMemo for savedRecipeIds
        } catch (error) {
            console.error("Error fetching saved recipes:", error);
            // Don't log out here, maybe just show an error
            toast.error("Could not load saved recipes.");
            // Ensure saved recipes are cleared on error to avoid stale data causing issues
            setSavedRecipes([]);
        }
    };

    const login = async (email, password) => {
        setIsLoading(true); // Start loading
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await axios.post('/token', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const newToken = res.data.access_token;
            setToken(newToken); // Update token state
            localStorage.setItem('token', newToken); // Store token
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`; // Set header for next requests

            // --- Fetch user profile *before* navigating ---
            const userRes = await axios.get('/users/me');
            const fetchedUser = userRes.data;
            setUserProfile(fetchedUser); // Update user profile state

            // Fetch saved recipes *after* user profile is confirmed
            await fetchSavedRecipes(); // This sets savedRecipes, which updates savedRecipeIds via useMemo

             // --- Check role and navigate ---
            setIsLoading(false); // Stop loading *before* navigation potentially unmounts things
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
            setIsLoading(false); // Ensure loading stops on error
        }
    };

    const loginWithGoogle = async (credentialResponse) => {
        setIsLoading(true); // Start loading
        try {
            const res = await axios.post('/api/auth/google', {
                token: credentialResponse.credential
            });

            const newToken = res.data.access_token;
            setToken(newToken);
            localStorage.setItem('token', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            // --- Fetch user profile *before* navigating ---
            const userRes = await axios.get('/users/me');
            const fetchedUser = userRes.data;
            setUserProfile(fetchedUser); // Update user profile state

            // Fetch saved recipes
            await fetchSavedRecipes(); // Updates savedRecipeIds via useMemo

            // --- Check role and navigate ---
            setIsLoading(false); // Stop loading
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
            setIsLoading(false); // Ensure loading stops on error
        }
    };

    const logout = () => {
        setToken(null);
        setUserProfile(null);
        setSavedRecipes([]); // Clear saved recipes array
        setSelectedRecipes([]);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        navigate('/'); // Navigate to home on logout
        toast.info("You have been logged out."); // Optional: info toast on logout
    };

    // --- Recipe Selection Functions ---
     const handleSelectRecipe = (recipe) => {
         // This seems to expect the full recipe object in selectedRecipes, not just ID
         setSelectedRecipes(prevSelected => {
             const existingIndex = prevSelected.findIndex(item => item.recipe.id === recipe.id);
             if (existingIndex > -1) {
                 // Already selected, remove it
                 return prevSelected.filter(item => item.recipe.id !== recipe.id);
             } else {
                 // Not selected, add it with quantity 1
                 return [...prevSelected, { recipe: recipe, quantity: 1 }];
             }
         });
     };

     // --- NEW Quantity Stepper Functions ---
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
                  // Decrease quantity if above 1
                  return prevSelected.map(item =>
                      item.recipe.id === recipeId
                          ? { ...item, quantity: item.quantity - 1 }
                          : item
                  );
              } else {
                  // Remove item if quantity is 1 or less
                  return prevSelected.filter(item => item.recipe.id !== recipeId);
              }
          });
      };
     // --- End Quantity Stepper Functions ---


    // --- Renamed functions to match RecipeCard expectations ---
    const saveRecipe = async (recipe) => { // Expects full recipe object
        // Check if already saved (using the new Set)
        if (savedRecipeIds.has(recipe.id)) {
             toast.info("Recipe already saved.");
             return;
        }
        try {
            await axios.post(`/api/users/me/saved-recipes/${recipe.id}`);
            // Optimistically update state by adding the full recipe object
            setSavedRecipes(prev => [...prev, recipe]);
            toast.success("Recipe saved!");
        } catch (error) {
            console.error("Error saving recipe:", error);
            toast.error("Could not save recipe.");
        }
    };

    const unsaveRecipe = async (recipeId) => { // Expects only recipe ID
        try {
            await axios.delete(`/api/users/me/saved-recipes/${recipeId}`);
            // Optimistically update state by filtering by ID
            setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
            toast.info("Recipe removed from saved.");
        } catch (error) {
            console.error("Error unsaving recipe:", error);
            toast.error("Could not unsave recipe.");
        }
    };
    // --- End Renamed Functions ---

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
            savedRecipes, // Provide the array too, might be useful elsewhere
            // --- *** FIX PART 2: Provide the Set and correct function names *** ---
            savedRecipeIds,    // Provide the new Set
            saveRecipe,        // Provide function named saveRecipe
            unsaveRecipe,      // Provide function named unsaveRecipe
            // --- *** END FIX PART 2 *** ---
            fetchSavedRecipes,
            // --- NEW: Provide quantity functions ---
            incrementRecipeQuantity,
            decrementRecipeQuantity
            // --- End NEW ---
        }}>
            {children}
        </AuthContext.Provider>
    );
};