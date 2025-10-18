// src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AuthContext = createContext();

// --- Set Axios base URL ---
axios.defaults.baseURL = 'http://127.0.0.1:8000';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
      fetchSavedRecipes();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setIsLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('/users/me');
      setUserProfile(res.data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      if (error.response && error.response.status === 401) {
        logout(); // Token is invalid or expired
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
    }
  };

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await axios.post('/token', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const new_token = res.data.access_token;
      setToken(new_token);
      localStorage.setItem('token', new_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${new_token}`;
      
      await fetchUserProfile(); // Fetch profile right after login
      await fetchSavedRecipes(); // Fetch saved recipes right after login
      
      navigate('/dashboard');
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.detail || "Login failed");
    }
  };

  const loginWithGoogle = async (credentialResponse) => {
    try {
      const res = await axios.post('/api/auth/google', {
        token: credentialResponse.credential
      });
      
      const new_token = res.data.access_token;
      setToken(new_token);
      localStorage.setItem('token', new_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${new_token}`;

      await fetchUserProfile();
      await fetchSavedRecipes();
      
      navigate('/dashboard');
      toast.success("Successfully logged in with Google!");
    } catch (error) {
      console.error("Google login error:", error);
      toast.error(error.response?.data?.detail || "Google login failed");
    }
  };

  const logout = () => {
    setToken(null);
    setUserProfile(null);
    setSavedRecipes([]);
    setSelectedRecipes([]);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/');
  };

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipes(prevSelected => {
      const isSelected = prevSelected.find(r => r.id === recipe.id);
      if (isSelected) {
        return prevSelected.filter(r => r.id !== recipe.id);
      } else {
        return [...prevSelected, recipe];
      }
    });
  };

  const handleSaveRecipe = async (recipe) => {
    try {
      await axios.post(`/api/users/me/saved-recipes/${recipe.id}`);
      setSavedRecipes(prev => [...prev, recipe]);
      toast.success("Recipe saved!");
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Could not save recipe.");
    }
  };

  const handleUnsaveRecipe = async (recipeId) => {
    try {
      await axios.delete(`/api/users/me/saved-recipes/${recipeId}`);
      setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
      toast.info("Recipe removed from saved.");
    } catch (error) {
      console.error("Error unsaving recipe:", error);
      toast.error("Could not unsave recipe.");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      userProfile, 
      isLoading, 
      login, 
      loginWithGoogle,
      logout, 
      fetchUserProfile,
      selectedRecipes,
      handleSelectRecipe,
      savedRecipes,
      handleSaveRecipe,
      handleUnsaveRecipe,
      fetchSavedRecipes
    }}>
      {children}
    </AuthContext.Provider>
  );
};