// src/pages/PantryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import BarcodeScanner from '../components/BarcodeScanner';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import './PantryPage.css';
import './Page.css';

const PantryPage = () => {
  const [pantryItems, setPantryItems] = useState([]);
  const [staples, setStaples] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  // --- NEW: Loading state for receipt processing ---
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

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
      // Avoid toast if it's just an initial load 401
      if (!error.response || error.response.status !== 401) {
          toast.error("Could not load pantry items or staples.");
      }
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
     if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
        toast.warn("Cannot add an empty item name.");
        return;
    }
    const trimmedItemName = itemName.trim();

    // Check case-insensitively
    if (pantryItems.some(item => item.name.toLowerCase() === trimmedItemName.toLowerCase())) {
        toast.info(`"${trimmedItemName}" is already in your pantry.`);
        // Clear search only if the added item matches the current search term
        if (searchTerm.toLowerCase() === trimmedItemName.toLowerCase()) {
            setSearchTerm('');
            setSearchResults([]);
        }
        return;
    }


    const optimisticItem = { ingredient_id: Date.now(), name: trimmedItemName, category: 'Unknown' }; // Use unique temp ID
    // Add optimistically and sort immediately
    setPantryItems(prev => [...prev, optimisticItem].sort((a, b) => a.name.localeCompare(b.name)));

    axios.post('/api/pantry', { ingredient_name: trimmedItemName })
      .then(res => {
        // Replace optimistic item with actual data from backend
        setPantryItems(prev => prev.map(item => item.ingredient_id === optimisticItem.ingredient_id ? res.data : item)
                                  .sort((a, b) => a.name.localeCompare(b.name))); // Ensure sort order is maintained
        toast.success(`"${trimmedItemName}" added to pantry!`);
        // Clear search only if the added item matches the current search term
         if (searchTerm.toLowerCase() === trimmedItemName.toLowerCase()) {
            setSearchTerm('');
            setSearchResults([]);
        }
      })
      .catch(error => {
        console.error("Error adding item:", error);
        toast.error(`Failed to add "${trimmedItemName}". ${error.response?.data?.detail || ''}`);
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
        // If removal fails, might need to re-fetch to restore consistency
        // fetchPantryItems(); // You would need to extract fetch logic
      });
  };

  const handleScanSuccess = (productName) => {
     if(productName) {
          handleAddItem(productName);
      }
  };

  // --- UPDATED: Send image file to backend ---
  const handleReceiptScan = async (imageFile) => {
      console.log("Receipt image File object received:", imageFile);
      setIsReceiptScannerOpen(false); // Close modal immediately

      if (!imageFile) {
          toast.error("No image file received.");
          return;
      }

      setIsProcessingReceipt(true); // Show loading state
      const processingToastId = toast.loading("Uploading and processing receipt...");

      // Create FormData to send the file
      const formData = new FormData();
      // "file" must match the parameter name in the backend endpoint (file: UploadFile = File(...))
      formData.append("file", imageFile, imageFile.name);

      try {
          // Make the POST request to the backend
          const response = await axios.post('/api/pantry/scan-receipt', formData, {
              headers: {
                  // 'Content-Type': 'multipart/form-data' // Axios typically sets this correctly for FormData
              },
          });

          console.log("Backend response:", response.data);
          toast.update(processingToastId, {
              render: response.data.message || "Receipt processed (Backend needs full implementation)",
              type: "success",
              isLoading: false,
              autoClose: 5000,
          });

          // --- TODO: Update pantry based on response ---
          // Once the backend returns a list of added items in response.data.added_items,
          // update the pantryItems state more intelligently instead of just re-fetching.
          // Example (needs backend to return items added):
          // if (response.data.added_items && response.data.added_items.length > 0) {
          //    fetchPantryItems(); // Or merge response.data.added_items into pantryItems state
          // }

          // For now, simple re-fetch might be okay for testing:
           setIsLoading(true); // Show loading while fetching
           axios.get('/api/pantry')
             .then(pantryRes => setPantryItems(pantryRes.data))
             .catch(err => toast.error("Failed to refresh pantry after receipt scan."))
             .finally(() => setIsLoading(false));
          // --- END TODO ---

      } catch (error) {
          console.error("Error uploading/processing receipt:", error);
          const errorMsg = error.response?.data?.detail || "Failed to process receipt.";
          toast.update(processingToastId, {
              render: `Error: ${errorMsg}`,
              type: "error",
              isLoading: false,
              autoClose: 5000,
          });
      } finally {
          setIsProcessingReceipt(false); // Hide loading state
      }
  };

  // Helper function to re-fetch pantry (used above)
  const fetchPantryItems = () => {
      setIsLoading(true);
      axios.get('/api/pantry')
        .then(pantryRes => setPantryItems(pantryRes.data))
        .catch(error => {
          console.error("Error fetching pantry data:", error);
          if (!error.response || error.response.status !== 401) {
            toast.error("Could not load pantry items.");
          }
        })
        .finally(() => setIsLoading(false));
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

  // Combined loading state
  const isPageLoading = isLoading || isProcessingReceipt;

  return (
    // Add loading class to slightly dim page during processing
    <div className={`app-container pantry-page ${isPageLoading ? 'processing-overlay' : ''}`}>
      {/* Optional: Add a simple loading indicator - consider a more prominent one */}
      {isProcessingReceipt && <div className="loading-indicator">Processing Receipt...</div>}

      {isScannerOpen && <BarcodeScanner onClose={() => setIsScannerOpen(false)} onScanSuccess={handleScanSuccess} />}
      {isReceiptScannerOpen && <ReceiptScannerModal onClose={() => setIsReceiptScannerOpen(false)} onScan={handleReceiptScan} />}

      <div className="page-header pantry-header">
        <h1>My Pantry</h1>
        <div className="pantry-header-actions">
            {/* Disable buttons while processing */}
            <button onClick={() => setIsScannerOpen(true)} className="pantry-action-btn barcode-btn" disabled={isPageLoading}>
               📷 Scan Barcode
            </button>
            <button onClick={() => setIsReceiptScannerOpen(true)} className="pantry-action-btn receipt-btn" disabled={isPageLoading}>
               🧾 Scan Receipt
            </button>
        </div>
      </div>

      <div className="pantry-layout">
        <div className="pantry-main-content">
          <h2>Current Pantry Items</h2>
          {isLoading && pantryItems.length === 0 ? ( // Show loading text only on initial load
             <p>Loading pantry...</p>
          ) : pantryItems.length === 0 ? (
            <p>Your pantry is empty. Add some items using the sections below!</p>
          ) : (
            sortedCategories.map(category => (
              <div key={category} className="pantry-category">
                <h3>{category}</h3>
                <ul className="pantry-item-list">
                  {categorizedItems[category].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                    <li key={item.ingredient_id} className="pantry-item">
                      <span>{item.name}</span>
                      {/* Disable remove button while processing */}
                      <button onClick={() => handleRemoveItem(item.ingredient_id, item.name)} disabled={isPageLoading}>&times;</button>
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
              disabled={isPageLoading} // Disable input while processing
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
                    disabled={isPageLoading} // Disable button
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
                    <button key={staple.ingredient_id} onClick={() => handleAddItem(staple.name)} disabled={isPageLoading}> {/* Disable button */}
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