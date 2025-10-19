// src/pages/PantryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import BarcodeScanner from '../components/BarcodeScanner'; // <-- IMPORT SCANNER
import './PantryPage.css';
import './Page.css';

const PantryPage = () => {
  const [pantryItems, setPantryItems] = useState([]);
  const [staples, setStaples] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false); // <-- STATE FOR SCANNER

  // Fetch initial pantry items and staples
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      axios.get('/api/pantry'),
      axios.get('/api/ingredients/staples')
    ]).then(([pantryRes, staplesRes]) => {
      setPantryItems(pantryRes.data);
      setStaples(staplesRes.data);
    }).catch(error => {
      console.error("Error fetching pantry data:", error);
      toast.error("Could not load pantry items or staples.");
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Handle search input changes
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timer = setTimeout(() => {
        axios.get(`/api/ingredients/search?q=${searchTerm}`)
          .then(res => setSearchResults(res.data))
          .catch(err => console.error("Search error:", err));
      }, 300); // Debounce search
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleAddItem = (itemName) => {
    // Prevent adding duplicates visually before backend confirms
    if (pantryItems.some(item => item.name.toLowerCase() === itemName.toLowerCase())) {
        toast.info(`"${itemName}" is already in your pantry.`);
        return;
    }

    const optimisticItem = { ingredient_id: Date.now(), name: itemName, category: 'Unknown' }; // Temporary ID
    setPantryItems(prev => [...prev, optimisticItem].sort((a, b) => a.name.localeCompare(b.name))); // Add optimistically and sort

    axios.post('/api/pantry', { ingredient_name: itemName })
      .then(res => {
        // Replace optimistic item with actual data from backend
        setPantryItems(prev => prev.map(item => item.ingredient_id === optimisticItem.ingredient_id ? res.data : item)
                                  .sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`"${itemName}" added to pantry!`);
        setSearchTerm(''); // Clear search after adding
        setSearchResults([]);
      })
      .catch(error => {
        console.error("Error adding item:", error);
        toast.error(`Failed to add "${itemName}". ${error.response?.data?.detail || ''}`);
        // Remove optimistic item on failure
        setPantryItems(prev => prev.filter(item => item.ingredient_id !== optimisticItem.ingredient_id));
      });
  };

  const handleRemoveItem = (itemId, itemName) => {
    setPantryItems(prev => prev.filter(item => item.ingredient_id !== itemId)); // Remove optimistically
    axios.delete(`/api/pantry/${itemId}`)
      .then(() => {
        toast.info(`"${itemName}" removed from pantry.`);
      })
      .catch(error => {
        console.error("Error removing item:", error);
        toast.error(`Failed to remove "${itemName}".`);
        // Add item back on failure? Might be complex, refetch might be simpler
        // For simplicity, we don't add it back here. A full refresh would fix it.
      });
  };

  // --- NEW: Function called by scanner on success ---
  const handleScanSuccess = (productName) => {
      if(productName) {
          handleAddItem(productName);
      }
  };

  const categorizedItems = useMemo(() => {
    return pantryItems.reduce((acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  }, [pantryItems]);

  const sortedCategories = useMemo(() => Object.keys(categorizedItems).sort(), [categorizedItems]);
  const sortedStapleCategories = useMemo(() => Object.keys(staples).sort(), [staples]);

  if (isLoading) return <div className="page-container">Loading pantry...</div>;

  return (
    <div className="app-container pantry-page">
      {/* --- RENDER SCANNER MODAL --- */}
      {isScannerOpen && <BarcodeScanner onClose={() => setIsScannerOpen(false)} onScanSuccess={handleScanSuccess} />}

      <div className="page-header">
        <h1>My Pantry</h1>
         {/* --- SCAN BUTTON --- */}
        <button onClick={() => setIsScannerOpen(true)} className="pantry-scan-btn">
           📷 Scan Barcode
        </button>
      </div>

      <div className="pantry-layout">
        <div className="pantry-main-content">
          <h2>Current Pantry Items</h2>
          {pantryItems.length === 0 ? (
            <p>Your pantry is empty. Add some items using the sections below!</p>
          ) : (
            sortedCategories.map(category => (
              <div key={category} className="pantry-category">
                <h3>{category}</h3>
                <ul className="pantry-item-list">
                  {categorizedItems[category].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                    <li key={item.ingredient_id} className="pantry-item">
                      <span>{item.name}</span>
                      <button onClick={() => handleRemoveItem(item.ingredient_id, item.name)}>&times;</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <aside className="pantry-sidebar">
          <h2>Add Items</h2>
          <div className="pantry-search">
            <input
              type="text"
              placeholder="Search & add ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map(item => (
                  <li key={item.ingredient_id} onClick={() => handleAddItem(item.name)}>
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
             {searchTerm.length >= 2 && searchResults.length === 0 && (
                <button
                    className="add-new-item-btn"
                    onClick={() => handleAddItem(searchTerm)}
                >
                    Add "{searchTerm}" as a new item
                </button>
            )}
          </div>

          <div className="staples-section">
            <h3>Quick Add Staples</h3>
            {sortedStapleCategories.map(category => (
              <div key={category} className="staple-category">
                <h4>{category}</h4>
                <div className="staple-items">
                  {staples[category].sort((a,b)=> a.name.localeCompare(b.name)).map(staple => (
                    <button key={staple.ingredient_id} onClick={() => handleAddItem(staple.name)}>
                      {staple.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PantryPage;