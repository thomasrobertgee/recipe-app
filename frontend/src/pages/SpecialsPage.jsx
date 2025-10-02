// src/pages/SpecialsPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './SpecialsPage.css';

const STORES = ["Coles", "Woolworths", "Aldi"];
const UNITS = ["per kg", "per g", "each", "per pack", "per bunch", "per punnet", "2 for", "3 for"];

const SpecialsPage = () => {
  const [specials, setSpecials] = useState([]);
  const [formState, setFormState] = useState({
    ingredient_name: '',
    price_value: '',
    price_unit: UNITS[0],
    store: STORES[0],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  // Get token AND the new isLoading state from our AuthContext
  const { token, isLoading: authIsLoading } = useAuth();

  const fetchSpecials = () => {
    axios.get('http://127.0.0.1:8000/api/specials')
      .then(response => setSpecials(response.data))
      .catch(error => {
        console.error("Error fetching specials:", error);
        toast.error("Could not fetch specials list.");
      });
  };

  // --- FIX 1: The useEffect now depends on the auth loading state ---
  // It will only run once the token is confirmed AND the auth setup is finished.
  useEffect(() => {
    if (token && !authIsLoading) {
      fetchSpecials();
    }
  }, [token, authIsLoading]);

  const handleInputChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const priceString = formState.price_unit.includes('for')
      ? `${formState.price_unit} $${formState.price_value}`
      : `$${formState.price_value} ${formState.price_unit}`;
    const specialDataToSend = {
      ingredient_name: formState.ingredient_name,
      price: priceString,
      store: formState.store,
    };
    
    const promise = axios.post('http://127.0.0.1:8000/api/specials', specialDataToSend);

    toast.promise(promise, {
        loading: 'Adding special...',
        success: 'Special added!',
        error: 'Failed to add special.',
    }).then(() => {
        fetchSpecials();
        setFormState({ ingredient_name: '', price_value: '', price_unit: UNITS[0], store: STORES[0] });
    });
  };

  const handleDelete = (specialId) => {
    axios.delete(`http://127.0.0.1:8000/api/specials/${specialId}`)
      .then(() => setSpecials(specials.filter(s => s.id !== specialId)))
      .catch(error => console.error("Error deleting special:", error));
  };
  
  const handleClearAll = () => {
    axios.delete('http://127.0.0.1:8000/api/specials')
      .then(() => setSpecials([]))
      .catch(error => console.error("Error clearing specials:", error));
  };

  // --- FIX 2: Rewritten to use toast.update for the persistent toast bug ---
  const handleGenerateRecipes = async () => {
    if (specials.length === 0) {
      toast.error("Please add some specials before generating recipes.");
      return;
    }
    
    setIsGenerating(true);
    const toastId = toast.loading("Asking the AI for recipes...");

    try {
      const profileResponse = await axios.get('http://127.0.0.1:8000/users/me');
      const preferences = profileResponse.data;
      const payload = { specials, preferences };
      const generateResponse = await axios.post('http://127.0.0.1:8000/api/generate-recipes', payload);

      // Explicitly update the toast on success
      toast.update(toastId, { render: generateResponse.data.message, type: "success", isLoading: false, autoClose: 5000 });

    } catch (error) {
      console.error("Error generating recipes:", error);
      // Explicitly update the toast on error
      toast.update(toastId, { render: "An error occurred while generating recipes.", type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      {/* (The JSX is unchanged, but included for completeness) */}
      <div className="generate-section">
        <h2>Generate Recipes</h2>
        <p>Once you've added your specials for the week, click the button below to ask the AI to generate new recipes based on your profile preferences.</p>
        <button onClick={handleGenerateRecipes} disabled={isGenerating} className="generate-btn">
          {isGenerating ? 'Generating...' : '✨ Generate Recipes From Specials'}
        </button>
      </div>

      <div className="specials-container">
        <div className="form-section">
          <h2>Add a New Special</h2>
          <form onSubmit={handleSubmit}>
            <input name="ingredient_name" value={formState.ingredient_name} onChange={handleInputChange} placeholder="Ingredient Name" required />
            <div className="price-group">
              <input type="number" name="price_value" value={formState.price_value} onChange={handleInputChange} placeholder="Price" required step="0.01"/>
              <select name="price_unit" value={formState.price_unit} onChange={handleInputChange}>
                {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
            <select name="store" value={formState.store} onChange={handleInputChange}>
              {STORES.map(store => <option key={store} value={store}>{store}</option>)}
            </select>
            <button type="submit">Add Special</button>
          </form>
        </div>
        <div className="list-section">
          <div className="list-header">
              <h2>Current Specials</h2>
              <button onClick={handleClearAll} className="clear-all-btn">Clear All</button>
          </div>
          <ul>
            {specials.map(special => (
              <li key={special.id}>
                <div>
                  <strong>{special.ingredient_name}</strong>
                  <span>{special.price} at {special.store}</span>
                </div>
                <button onClick={() => handleDelete(special.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SpecialsPage;