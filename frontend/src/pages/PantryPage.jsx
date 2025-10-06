// src/pages/PantryPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './PantryPage.css';

const PantryPage = () => {
  const [pantryItems, setPantryItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPantryItems = () => {
    axios.get('http://127.0.0.1:8000/api/pantry')
      .then(res => setPantryItems(res.data))
      .catch(err => console.error("Error fetching pantry items:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    setIsLoading(true);
    fetchPantryItems();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const delayDebounceFn = setTimeout(() => {
        axios.get(`http://127.0.0.1:8000/api/ingredients/search?q=${searchTerm}`)
          .then(res => setSearchResults(res.data))
          .catch(err => console.error("Error searching ingredients:", err));
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleAddItem = (ingredientName) => {
    axios.post('http://127.0.0.1:8000/api/pantry', { ingredient_name: ingredientName })
      .then(() => {
        toast.success(`"${ingredientName}" added to your pantry.`);
        fetchPantryItems();
        setSearchTerm('');
        setSearchResults([]);
      })
      .catch(err => {
        console.error("Error adding pantry item:", err);
        toast.error(err.response?.data?.detail || "Could not add item.");
      });
  };

  const handleRemoveItem = (item) => {
    axios.delete(`http://127.0.0.1:8000/api/pantry/${item.ingredient_id}`)
      .then(() => {
        toast.info(`"${item.name}" removed from your pantry.`);
        fetchPantryItems();
      })
      .catch(err => {
        console.error("Error removing pantry item:", err);
        toast.error("Could not remove item.");
      });
  };
  
  const categorizedItems = useMemo(() => {
    const groups = {};
    const sortedItems = [...pantryItems].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedItems.forEach(item => {
        const category = item.category || "Other";
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(item);
    });
    return groups;
  }, [pantryItems]);

  return (
    <div className="pantry-page-container">
      <div className="pantry-header">
        <h1>My Pantry</h1>
        <p>Add ingredients you already have at home. The AI will prioritize these when generating recipes to help you save money and reduce waste.</p>
      </div>

      <div className="add-item-section">
        <input
          type="text"
          placeholder="Search for an ingredient to add..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pantry-search-input"
        />
        {searchResults.length > 0 && (
          <ul className="search-results-list">
            {searchResults.map(item => (
              <li key={item.ingredient_id} onClick={() => handleAddItem(item.name)}>
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pantry-list-section">
        <h2>Current Pantry Items</h2>
        {isLoading ? (
          <p>Loading your pantry...</p>
        ) : pantryItems.length > 0 ? (
          <div className="pantry-categories">
            {Object.entries(categorizedItems).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
              <div key={category} className="pantry-category">
                <h3>{category}</h3>
                <ul className="pantry-list">
                  {items.map(item => (
                    <li key={item.ingredient_id}>
                      <span>{item.name}</span>
                      <button onClick={() => handleRemoveItem(item)} className="remove-item-btn">×</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p>Your pantry is empty. Add some items using the search bar above!</p>
        )}
      </div>
    </div>
  );
};

export default PantryPage;