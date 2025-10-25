// src/pages/PantryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
// --- NEW: Import Correction Modal ---
import ReceiptCorrectionModal from '../components/ReceiptCorrectionModal';
import './PantryPage.css';
import './Page.css';

const PantryPage = () => {
    const {
        pantryItems,
        addPantryItem,
        removePantryItem,
        fetchPantryItems,
        isLoading: isAuthLoading
    } = useAuth();

    const [staples, setStaples] = useState({});
    const [isStaplesLoading, setIsStaplesLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
    const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
    // --- NEW: State for correction modal ---
    const [itemsToCorrect, setItemsToCorrect] = useState([]);
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

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
    }, []);

    useEffect(() => {
        if (searchTerm.length >= 2) {
            const timer = setTimeout(() => {
                axios.get(`/api/ingredients/search?q=${searchTerm}`)
                    .then(res => setSearchResults(res.data))
                    .catch(err => console.error("Search error:", err));
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    const handleAddItem = async (itemName) => {
        if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
            toast.warn("Cannot add an empty item name.");
            return;
        }
        const trimmedItemName = itemName.trim();
        const newItem = await addPantryItem(trimmedItemName); // Call context function
        if (newItem && searchTerm.toLowerCase() === trimmedItemName.toLowerCase()) {
            setSearchTerm('');
            setSearchResults([]);
        }
    };

    const handleRemoveItem = (itemId, itemName) => {
        removePantryItem(itemId, itemName); // Call context function
    };

    const handleScanSuccess = (productName) => {
        if (productName) {
            handleAddItem(productName);
        }
        setIsScannerOpen(false); // Close scanner on success/callback
    };

    // --- UPDATED: Handle Receipt Scan to open Correction Modal ---
    const handleReceiptScan = async (imageFile) => {
        setIsReceiptScannerOpen(false);
        if (!imageFile) return;

        setIsProcessingReceipt(true);
        const processingToastId = toast.loading("Uploading and processing receipt...");
        const formData = new FormData();
        formData.append("file", imageFile, imageFile.name);

        try {
            // Backend now returns { message: "...", detected_items: [...] }
            const response = await axios.post('/api/pantry/scan-receipt', formData);

            console.log("Backend response:", response.data);
            const detected = response.data.detected_items || [];

            if (detected.length > 0) {
                toast.update(processingToastId, {
                    render: `Detected ${detected.length} items. Please review.`,
                    type: "info",
                    isLoading: false,
                    autoClose: 3000,
                });
                // --- Open correction modal ---
                setItemsToCorrect(detected);
                setIsCorrectionModalOpen(true);
            } else {
                // Handle case where OCR worked but AI found no items
                 toast.update(processingToastId, {
                    render: response.data.message || "No grocery items identified.",
                    type: "warning",
                    isLoading: false,
                    autoClose: 5000,
                });
            }

            // --- REMOVED: fetchPantryItems() call here ---

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
    // --- END UPDATED ---

    // --- NEW: Callback function for Correction Modal ---
    const confirmItemsCallback = async (correctedItems) => {
        if (!correctedItems || correctedItems.length === 0) {
            toast.info("No items were confirmed to add.");
            return;
        }

        const addToastId = toast.loading(`Adding ${correctedItems.length} items to pantry...`);
        let addedCount = 0;
        let alreadyPresentCount = 0;

        // Use Promise.all to add items concurrently (optional, but can be faster)
        const addPromises = correctedItems.map(async (itemName) => {
             // addPantryItem now handles duplicate checks and toasts internally
             const newItem = await addPantryItem(itemName);
             if (newItem) {
                 addedCount++;
             } else {
                 // addPantryItem returns null if item already exists or fails
                 // Check if it already exists (might need slight adjustment in addPantryItem context)
                 if (pantryItems.some(p => p.name.toLowerCase() === itemName.toLowerCase())) {
                     alreadyPresentCount++;
                 }
             }
        });

        try {
            await Promise.all(addPromises);
            let message = "";
            if (addedCount > 0) message += `Added ${addedCount} new item(s). `;
            if (alreadyPresentCount > 0) message += `${alreadyPresentCount} item(s) already present.`;
            if (!message) message = "No items added."; // Fallback

            toast.update(addToastId, {
                render: message,
                type: "success",
                isLoading: false,
                autoClose: 5000,
            });
        } catch (error) {
             // Errors should be handled within addPantryItem, but catch any unexpected ones
            console.error("Error during bulk add from correction:", error);
            toast.update(addToastId, {
                render: "An error occurred while adding items.",
                type: "error",
                isLoading: false,
                autoClose: 5000,
            });
        }

        // No need to call fetchPantryItems here, addPantryItem updates context state
        setIsCorrectionModalOpen(false); // Ensure modal is closed
    };
    // --- END NEW ---

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

    const isPageLoading = isAuthLoading || isStaplesLoading || isProcessingReceipt;

    return (
        <div className={`app-container pantry-page ${isPageLoading ? 'processing-overlay' : ''}`}>
            {isProcessingReceipt && <div className="loading-indicator">Processing Receipt...</div>}

            {isScannerOpen && <BarcodeScanner onClose={() => setIsScannerOpen(false)} onScanSuccess={handleScanSuccess} />}
            {isReceiptScannerOpen && <ReceiptScannerModal onClose={() => setIsReceiptScannerOpen(false)} onScan={handleReceiptScan} />}

            {/* --- NEW: Render Correction Modal --- */}
            {isCorrectionModalOpen && (
                <ReceiptCorrectionModal
                    detectedItems={itemsToCorrect}
                    onClose={() => setIsCorrectionModalOpen(false)}
                    onConfirm={confirmItemsCallback}
                />
            )}
            {/* --- END NEW --- */}

            <div className="page-header pantry-header">
                <h1>My Pantry</h1>
                <div className="pantry-header-actions">
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
                            disabled={isPageLoading}
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
                                disabled={isPageLoading}
                            >
                                Add "{searchTerm}" as a new item
                            </button>
                        )}
                    </div>

                    <div className="staples-section">
                        <h3>Quick Add Staples</h3>
                        {isStaplesLoading ? <p>Loading staples...</p> : (
                            sortedStapleCategories.map(category => (
                                <div key={category} className="staple-category">
                                    <h4>{category}</h4>
                                    <div className="staple-items">
                                        {staples[category].sort((a, b) => a.name.localeCompare(b.name)).map(staple => (
                                            <button key={staple.ingredient_id} onClick={() => handleAddItem(staple.name)} disabled={isPageLoading}>
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