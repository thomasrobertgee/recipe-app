// src/pages/SpecialsPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './SpecialsPage.css'; // We'll update this next

const SpecialsPage = () => {
  const [specials, setSpecials] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { token, isLoading: authIsLoading } = useAuth();

  useEffect(() => {
    if (token && !authIsLoading) {
      const fetchSpecials = () => {
        axios.get('http://127.0.0.1:8000/api/specials')
          .then(response => setSpecials(response.data))
          .catch(error => {
            console.error("Error fetching specials:", error);
            toast.error("Could not fetch specials list.");
          });
      };
      fetchSpecials();
    }
  }, [token, authIsLoading]);

  const handleGenerateRecipes = async () => {
    if (specials.length === 0) {
      toast.error("There are no specials to generate recipes from.");
      return;
    }
    
    setIsGenerating(true);
    const toastId = toast.loading("Asking the AI for recipes...");

    try {
      const profileResponse = await axios.get('http://127.0.0.1:8000/users/me');
      const preferences = profileResponse.data;
      const payload = { specials, preferences };
      const generateResponse = await axios.post('http://127.0.0.1:8000/api/generate-recipes', payload);
      toast.update(toastId, { render: generateResponse.data.message, type: "success", isLoading: false, autoClose: 5000 });
    } catch (error) {
      console.error("Error generating recipes:", error);
      toast.update(toastId, { render: "An error occurred while generating recipes.", type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="generate-section">
        <h2>Generate Recipes</h2>
        <p>Click the button below to ask the AI to generate new recipes based on the current specials and your profile preferences.</p>
        <button onClick={handleGenerateRecipes} disabled={isGenerating} className="generate-btn">
          {isGenerating ? 'Generating...' : '✨ Generate Recipes From Specials'}
        </button>
      </div>

      <div className="list-section">
        <h2>Current Weekly Specials</h2>
        <ul>
          {specials.map(special => (
            <li key={special.id}>
              <div>
                <strong>{special.ingredient_name}</strong>
                <span>at {special.store}</span>
              </div>
              <span className="special-price">{special.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SpecialsPage;