// src/pages/SpecialsPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

  const fetchSpecials = () => {
    axios.get('http://127.0.0.1:8000/api/specials')
      .then(response => setSpecials(response.data))
      .catch(error => console.error("Error fetching specials:", error));
  };

  useEffect(() => {
    fetchSpecials();
  }, []);

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
    axios.post('http://127.0.0.1:8000/api/specials', specialDataToSend)
      .then(() => {
        fetchSpecials();
        setFormState({ ingredient_name: '', price_value: '', price_unit: UNITS[0], store: STORES[0] });
      })
      .catch(error => console.error("Error adding special:", error));
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

  // --- THIS IS THE CHANGE ---
  // The function is now async to handle multiple API calls
  const handleGenerateRecipes = async () => {
    if (specials.length === 0) {
      alert("Please add some specials before generating recipes.");
      return;
    }
    setIsGenerating(true);
    try {
      // 1. Fetch the user's current preferences
      const profileResponse = await axios.get('http://127.0.0.1:8000/users/me');
      const preferences = profileResponse.data;

      // 2. Construct the payload with both specials and preferences
      const payload = {
        specials: specials,
        preferences: preferences,
      };

      // 3. Send everything to the generation endpoint
      const generateResponse = await axios.post('http://127.0.0.1:8000/api/generate-recipes', payload);
      alert(generateResponse.data.message);

    } catch (error) {
      console.error("Error generating recipes:", error);
      alert("An error occurred while generating recipes. Please check the console.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="specials-container">
        <div className="form-section">
          <h2>Add a New Special</h2>
          <form onSubmit={handleSubmit}>
            <input
              name="ingredient_name"
              value={formState.ingredient_name}
              onChange={handleInputChange}
              placeholder="Ingredient Name (e.g., Chicken Breast)"
              required
            />
            <div className="price-group">
              <input
                type="number"
                name="price_value"
                value={formState.price_value}
                onChange={handleInputChange}
                placeholder="Price (e.g., 9.50)"
                required
                step="0.01"
              />
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
      
      <div className="generate-section">
        <h2>Generate Recipes</h2>
        <p>Once you've added your specials for the week, click the button below to ask the AI to generate new recipes.</p>
        <button onClick={handleGenerateRecipes} disabled={isGenerating} className="generate-btn">
          {isGenerating ? 'Generating...' : '✨ Generate Recipes From Specials'}
        </button>
      </div>
    </div>
  );
};

export default SpecialsPage;