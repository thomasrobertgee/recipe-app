// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Needed for specials and receipt scan
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

// Import Dashboard Modules
import MealPlanPreview from '../components/dashboard/MealPlanPreview';
import PantrySnapshot from '../components/dashboard/PantrySnapshot';
import BudgetSummary from '../components/dashboard/BudgetSummary';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickActions from '../components/dashboard/QuickActions';
import NotificationsModule from '../components/dashboard/NotificationsModule';
import FeaturedSupplier from '../components/dashboard/FeaturedSupplier';
// --- NEW: Import Favourite Suppliers ---
import FavouriteSuppliers from '../components/dashboard/FavouriteSuppliers';
// --- END NEW ---

// Import Modals
import BarcodeScanner from '../components/BarcodeScanner';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import ReceiptCorrectionModal from '../components/ReceiptCorrectionModal';
import OnboardingModal from '../components/OnboardingModal';

// Import CSS
import './Page.css';
import './DashboardPage.css';
import '../components/dashboard/DashboardModule.css';

const DashboardPage = ({ allSpecials }) => {
  const { userProfile, isLoading: authIsLoading, addPantryItem, pantryItems } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // State for scanners
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [itemsToCorrect, setItemsToCorrect] = useState([]);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // State for Featured Supplier
  const [featuredSupplier, setFeaturedSupplier] = useState(null);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);

  useEffect(() => {
    if (!authIsLoading && userProfile && userProfile.has_completed_onboarding === false) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [userProfile, authIsLoading]);

  // Fetch Featured Supplier
  useEffect(() => {
    // Only fetch if user is logged in and not onboarding
    if (userProfile && userProfile.has_completed_onboarding) {
        setIsFeaturedLoading(true);
        axios.get('/api/suppliers/featured')
            .then(res => {
                // The API returns a list, we'll just feature the first one.
                if (res.data && res.data.length > 0) {
                    setFeaturedSupplier(res.data[0]);
                } else {
                    setFeaturedSupplier(null);
                }
            })
            .catch(err => {
                console.error("Error fetching featured supplier:", err);
                // Don't toast error for this, it's not critical
            })
            .finally(() => {
                setIsFeaturedLoading(false);
            });
    } else {
         setIsFeaturedLoading(false);
    }
  }, [userProfile]);

   const handleCloseOnboarding = () => {
        setShowOnboarding(false);
    };

    // --- Barcode Scanner Handler ---
    const handleScanSuccess = (productName) => {
        if (productName) {
            addPantryItem(productName); // Use context function
        }
        setIsBarcodeScannerOpen(false); // Close scanner on success/callback
    };

    // --- UPDATED: Receipt Scan Handler (copied from PantryPage) ---
    const handleReceiptScan = async (imageFile) => {
        setIsReceiptScannerOpen(false); // Close the initial scanner modal
        if (!imageFile) return;

        setIsProcessingReceipt(true); // Show processing indicator
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
                // Open correction modal with detected items
                setItemsToCorrect(detected);
                setIsCorrectionModalOpen(true);
            } else {
                 toast.update(processingToastId, {
                    render: response.data.message || "No grocery items identified.",
                    type: "warning",
                    isLoading: false,
                    autoClose: 5000,
                });
            }
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
            setIsProcessingReceipt(false); // Hide processing indicator
        }
    };
    // --- END UPDATED ---

    // --- NEW: Confirm Items Callback (copied from PantryPage) ---
    const confirmItemsCallback = async (correctedItems) => {
        if (!correctedItems || correctedItems.length === 0) {
            toast.info("No items were confirmed to add.");
            return;
        }

        const addToastId = toast.loading(`Adding ${correctedItems.length} items to pantry...`);
        let addedCount = 0;
        let alreadyPresentCount = 0;

        const addPromises = correctedItems.map(async (itemName) => {
             const newItem = await addPantryItem(itemName);
             if (newItem) {
                 addedCount++;
             } else {
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
            if (!message) message = "No items added.";

            toast.update(addToastId, {
                render: message, type: "success", isLoading: false, autoClose: 5000,
            });
        } catch (error) {
            console.error("Error during bulk add from correction:", error);
            toast.update(addToastId, {
                render: "An error occurred while adding items.", type: "error", isLoading: false, autoClose: 5000,
            });
        }
        setIsCorrectionModalOpen(false); // Close modal
    };
    // --- END NEW ---


  if (authIsLoading) {
    return <div className="app-container"><p className="loading-message">Loading dashboard...</p></div>;
  }

  if (!userProfile) {
       return (
            <div className="app-container">
                 <p className="error-message">Could not load user profile. Please try logging in again.</p>
                 <Link to="/login">Go to Login</Link>
            </div>
       );
  }

  return (
    <>
      {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}

      {/* Barcode Scanner Modal */}
      {isBarcodeScannerOpen && (
        <BarcodeScanner
            onClose={() => setIsBarcodeScannerOpen(false)}
            onScanSuccess={handleScanSuccess}
        />
      )}

      {/* Receipt Scanner Modal */}
      {isReceiptScannerOpen && (
          <ReceiptScannerModal
              onClose={() => setIsReceiptScannerOpen(false)}
              onScan={handleReceiptScan} // Triggers the updated handleReceiptScan
          />
      )}

      {/* --- NEW: Render Correction Modal --- */}
      {isCorrectionModalOpen && (
          <ReceiptCorrectionModal
              detectedItems={itemsToCorrect}
              onClose={() => setIsCorrectionModalOpen(false)}
              onConfirm={confirmItemsCallback}
          />
      )}
      {/* --- END NEW --- */}

      {/* Loading Indicator for Receipt Processing */}
      {isProcessingReceipt && <div className="loading-indicator">Processing Receipt...</div>}


      {/* Main Dashboard Layout */}
      <div className={`app-container ${isProcessingReceipt ? 'processing-overlay' : ''}`}>
        <div className="page-header"> <h1>Dashboard</h1> </div>

        <div className="dashboard-grid">
            <QuickActions
                onScanBarcode={() => setIsBarcodeScannerOpen(true)}
                onScanReceipt={() => setIsReceiptScannerOpen(true)} // This button now triggers the updated logic
                allSpecials={allSpecials}
            />
            {/* --- NEW: Render Favourite Suppliers --- */}
            <FavouriteSuppliers allSpecials={allSpecials} />
            {/* --- END NEW --- */}
            
            {!isFeaturedLoading && featuredSupplier && (
                <FeaturedSupplier supplier={featuredSupplier} />
            )}
            <NotificationsModule />
            <MealPlanPreview allSpecials={allSpecials} />
            <PantrySnapshot />
            <BudgetSummary allSpecials={allSpecials} />
            <RecentActivity />
        </div>
      </div>
    </>
  );
};
export default DashboardPage;