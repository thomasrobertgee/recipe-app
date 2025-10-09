// src/pages/SpecialsPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './SpecialsPage.css';
import './Page.css'; // <-- Import the new shared styles

const SpecialsPage = () => {
  const [specials, setSpecials] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { token, isLoading: authIsLoading, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState('');

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

  const categorizedSpecials = useMemo(() => {
    return specials.reduce((acc, special) => {
      const category = special.category || 'Other Specials';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(special);
      return acc;
    }, {});
  }, [specials]);

  const sortedCategories = useMemo(() => {
    return Object.keys(categorizedSpecials).sort((a, b) => a.localeCompare(b));
  }, [categorizedSpecials]);

  useEffect(() => {
    if (sortedCategories.length > 0 && !activeTab) {
      setActiveTab(sortedCategories[0]);
    }
  }, [sortedCategories, activeTab]);

  const handleGenerateRecipes = async () => {
    if (specials.length === 0) {
      toast.error("There are no specials to generate recipes from.");
      return;
    }
    
    setIsGenerating(true);
    const toastId = toast.loading("Asking the AI for recipes...");

    try {
      const pantryResponse = await axios.get('http://127.0.0.1:8000/api/pantry');
      const pantryItems = pantryResponse.data;

      const payload = { 
        specials, 
        preferences: userProfile,
        pantry_items: pantryItems
      };
      
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
    <div className="app-container">
      {/* --- UPDATED: Standardized page header --- */}
      <div className="page-header">
        <h1>Weekly Specials</h1>
      </div>

      <div className="generate-section">
        <h2>Generate Recipes</h2>
        <p>Click the button below to ask the AI to generate new recipes based on the current specials, your pantry items, and your profile preferences.</p>
        <button onClick={handleGenerateRecipes} disabled={isGenerating} className="generate-btn">
          {isGenerating ? 'Generating...' : '✨ Generate Recipes From Specials'}
        </button>
      </div>

      <div className="tabs-container">
        {sortedCategories.map(category => (
          <button
            key={category}
            className={`tab-btn ${activeTab === category ? 'active' : ''}`}
            onClick={() => setActiveTab(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab && categorizedSpecials[activeTab] ? (
          <div className="specials-grid">
            {categorizedSpecials[activeTab].sort((a,b) => a.ingredient_name.localeCompare(b.ingredient_name)).map(special => (
              <div key={special.id} className="special-card">
                <div className="special-card-content">
                  <strong>{special.ingredient_name}</strong>
                  <span>at {special.store}</span>
                </div>
                <span className="special-price">{special.price}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>No specials in this category.</p>
        )}
      </div>
    </div>
  );
};

export default SpecialsPage;