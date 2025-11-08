// src/pages/SpecialsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import PriceHistoryChart from '../components/PriceHistoryChart';
import { Link } from 'react-router-dom';
import './Page.css';
import './SpecialsPage.css';

const SpecialsPage = () => {
  const [categorizedSpecials, setCategorizedSpecials] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- NEW: Tab state ---
  const [activeTab, setActiveTab] = useState('local'); // 'local' or 'supermarket'
  const supermarkets = useMemo(() => ['Coles', 'Woolworths', 'Aldi'], []);
  // --- END NEW ---

  const { handleSelectSpecial, selectedSpecials } = useAuth();
  const selectedSpecialIdSet = useMemo(() =>
    new Set(selectedSpecials.map(s => s.id)),
    [selectedSpecials]
  );

  // State for price history modal
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);
  const [selectedIngredientName, setSelectedIngredientName] = useState(null);

  // --- FIX: Moved this hook before the conditional returns ---
  const { localStoreNames, supermarketStoreNames } = useMemo(() => {
    const allStoreNames = Object.keys(categorizedSpecials);
    const local = allStoreNames
      .filter(store => !supermarkets.includes(store))
      .sort();
    const supermarket = supermarkets
      .filter(store => categorizedSpecials[store]) // Only include supermarkets that have specials
      .sort();
    return { localStoreNames: local, supermarketStoreNames: supermarket };
  }, [categorizedSpecials, supermarkets]);
  // --- END FIX ---

  useEffect(() => {
    setIsLoading(true);
    axios.get('/api/prices/today')
      .then(response => {
        const specials = response.data;
        
        // Categorize *all* specials by store
        const categorized = specials.reduce((acc, special) => {
          const store = special.store || 'Other';
          if (!acc[store]) {
            acc[store] = [];
          }
          acc[store].push(special);
          return acc;
        }, {});
        
        setCategorizedSpecials(categorized);
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching specials:", err);
        if (!err.response || err.response.status !== 401) {
            setError("Could not load specials. Please try again later.");
            toast.error("Could not load specials.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []); // Removed 'supermarkets' from dependency array

  const handleShowHistory = (ingredientId, ingredientName) => {
    setSelectedIngredientId(ingredientId);
    setSelectedIngredientName(ingredientName);
    setShowPriceHistory(true);
  };

  const renderSpecials = (specials) => (
    specials.map(special => {
      const isSelected = selectedSpecialIdSet.has(special.id);
      return (
        <div key={special.id} className="special-item">
          <div className="special-item-info">
            <span className="special-item-name">{special.ingredient_name}</span>
            <span className="special-item-price">{special.price}</span>
          </div>
          <div className="special-item-actions">
            <button
              className="history-btn"
              onClick={() => handleShowHistory(special.ingredient_id, special.ingredient_name)}
              title="View price history"
            >
              📊
            </button>
            <button
                className={`add-to-list-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectSpecial(special)}
                title={isSelected ? "Remove from list" : "Add to list"}
            >
                {isSelected ? '✓' : '+'}
            </button>
          </div>
        </div>
      );
    })
  );

  if (isLoading) {
    return <div className="app-container"><p className="loading-message">Loading specials...</p></div>;
  }

  if (error) {
    return <div className="app-container"><p className="error-message">{error}</p></div>;
  }

  // --- NEW: Get stores for the active tab ---
  const activeStoreNames = activeTab === 'local' ? localStoreNames : supermarketStoreNames;
  // --- END NEW ---

  return (
    <>
      {showPriceHistory && (
        <PriceHistoryChart
          ingredientId={selectedIngredientId}
          ingredientName={selectedIngredientName}
          onClose={() => setShowPriceHistory(false)}
        />
      )}
      <div className="app-container">
        <div className="page-header">
          <h1>Today's Specials</h1>
        </div>
        
        {/* --- NEW: Tab Navigation --- */}
        <div className="dashboard-tabs specials-tabs">
            <button
                className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                onClick={() => setActiveTab('local')}
            >
                Local Specials
            </button>
            <button
                className={`tab-btn ${activeTab === 'supermarket' ? 'active' : ''}`}
                onClick={() => setActiveTab('supermarket')}
            >
                Supermarket Comparison
            </button>
        </div>
        {/* --- END NEW --- */}

        {activeStoreNames.length === 0 ? (
          <div className="empty-tab-message">
            {activeTab === 'local' ? (
              <p>No local specials found in your area right now. <Link to="/suppliers">Discover local suppliers</Link> and check back soon!</p>
            ) : (
              <p>No supermarket specials found today.</p>
            )}
          </div>
        ) : (
          <div className="specials-grid">
            {activeStoreNames.map(store => (
              <div key={store} className="store-category">
                <h2>{store}</h2>
                <div className="specials-list">
                  {renderSpecials(categorizedSpecials[store])}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default SpecialsPage;