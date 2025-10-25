// src/pages/PantryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
// --- NEW: Import useAuth ---
import { useAuth } from '../context/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import './PantryPage.css';
import './Page.css';

const PantryPage = () => {
    // --- NEW: Get pantry state and functions from context ---
    const { 
        pantryItems, 
        addPantryItem, 
        removePantryItem, 
        fetchPantryItems, // Get the refetch function
        isLoading: isAuthLoading // Use auth loading state for pantry
    } = useAuth();
    
    // --- UPDATED: Local state is now only for UI elements ---
    const [staples, setStaples] = useState({});
    const [isStaplesLoading, setIsStaplesLoading] = useState(true); // Separate loading for staples
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
    const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

    // --- UPDATED: Fetch only staples ---
    useEffect(() => {
        setIsStaplesLoading(true);
        axios.get('/api/ingredients/staples')
        .then(staplesRes => {
            setStaples(staplesRes.data);
        }).catch(error => {
            console.error("Error fetching pantry data:", error);
            if (!error.response || error.response.status !== 401) {
                toast.error("Could not load staples.");
            }
        }).finally(() => {
            setIsStaplesLoading(false);
        });
    }, []); // Runs once on mount

    // Handle search input changes (no change here)
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

    // --- UPDATED: Simplified handleAddItem ---
    const handleAddItem = async (itemName) => {
        if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
            toast.warn("Cannot add an empty item name.");
            return;
        }
        const trimmedItemName = itemName.trim();
        
        // Call the context function
        const newItem = await addPantryItem(trimmedItemName);
        
        // If item was added (not a duplicate) and matches search, clear search
        if (newItem && searchTerm.toLowerCase() === trimmedItemName.toLowerCase()) {
            setSearchTerm('');
            setSearchResults([]);
        }
    };

    // --- UPDATED: Simplified handleRemoveItem ---
    const handleRemoveItem = (itemId, itemName) => {
        // Call the context function
        removePantryItem(itemId, itemName);
    };

    const handleScanSuccess = (productName) => {
        if (productName) {
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

        const formData = new FormData();
        formData.append("file", imageFile, imageFile.name);

        try {
            const response = await axios.post('/api/pantry/scan-receipt', formData, {
                headers: {
                    // 'Content-Type': 'multipart/form-data' // Axios typically sets this correctly for FormData
                },
            });

            console.log("Backend response:", response.data);
            toast.update(processingToastId, {
                render: response.data.message || "Receipt processed",
                type: "success",
                isLoading: false,
                autoClose: 5000,
            });

            // --- UPDATED: Call context function to refetch pantry ---
            // This will update the global state, and this component will re-render
            fetchPantryItems();
            // --- END UPDATED ---

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
    
    // --- REMOVED local fetchPantryItems function ---

    const categorizedItems = useMemo(() => {
        return pantryItems.reduce((acc, item) => {
            const category = item.category || 'Other';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
    }, [pantryItems]); // Now depends on global pantryItems

    const sortedCategories = useMemo(() => Object.keys(categorizedItems).sort(), [categorizedItems]);
    const sortedStapleCategories = useMemo(() => Object.keys(staples).sort(), [staples]);

    // Combined loading state
    const isPageLoading = isAuthLoading || isStaplesLoading || isProcessingReceipt;

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
                    {/* --- UPDATED: Use isAuthLoading for pantry --- */}
                    {isAuthLoading ? (
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
                        {/* --- NEW: Show loading for staples --- */}
                        {isStaplesLoading ? <p>Loading staples...</p> : (
                            sortedStapleCategories.map(category => (
                                <div key={category} className="staple-category">
                                    <h4>{category}</h4>
                                    <div className="staple-items">
                                        {staples[category].sort((a, b) => a.name.localeCompare(b.name)).map(staple => (
                                            <button key={staple.ingredient_id} onClick={() => handleAddItem(staple.name)} disabled={isPageLoading}> {/* Disable button */}
                                                {staple.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PantryPage;