// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Needed for specials
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify'; // Keep for potential errors
import { Link } from 'react-router-dom'; // Keep for fallback links

// Import Dashboard Modules
import WelcomeStats from '../components/dashboard/WelcomeStats';
import MealPlanPreview from '../components/dashboard/MealPlanPreview';
import PantrySnapshot from '../components/dashboard/PantrySnapshot';
import BudgetSummary from '../components/dashboard/BudgetSummary';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickActions from '../components/dashboard/QuickActions';

// Import Modals (needed for QuickActions)
import BarcodeScanner from '../components/BarcodeScanner';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import OnboardingModal from '../components/OnboardingModal'; // Still needed

// Import CSS
import './Page.css'; // Common page header styles
import './DashboardPage.css'; // Grid layout styles

const DashboardPage = ({ allSpecials }) => { // Receives allSpecials from App.jsx
  const { userProfile, isLoading: authIsLoading, addPantryItem, fetchPantryItems } = useAuth(); // Get add/fetch pantry functions
  const [showOnboarding, setShowOnboarding] = useState(false);

  // State for scanners triggered by QuickActions
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false); // Add processing state


  useEffect(() => {
    if (!authIsLoading && userProfile && userProfile.has_completed_onboarding === false) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [userProfile, authIsLoading]);

   const handleCloseOnboarding = () => {
        setShowOnboarding(false);
        // Optionally trigger a profile refresh if needed after onboarding closes
        // fetchUserProfile();
    };

    // --- Scanner Handlers ---
    const handleScanSuccess = (productName) => {
        if (productName) {
            addPantryItem(productName); // Use context function
        }
        setIsBarcodeScannerOpen(false); // Close scanner on success
    };

    const handleReceiptScan = async (imageFile) => {
        setIsReceiptScannerOpen(false);
        if (!imageFile) return;

        setIsProcessingReceipt(true);
        const processingToastId = toast.loading("Uploading and processing receipt...");
        const formData = new FormData();
        formData.append("file", imageFile, imageFile.name);

        try {
            const response = await axios.post('/api/pantry/scan-receipt', formData);
            toast.update(processingToastId, {
                render: response.data.message || "Receipt processed", type: "success", isLoading: false, autoClose: 5000,
            });
            fetchPantryItems(); // Refresh pantry via context
        } catch (error) {
            console.error("Error processing receipt:", error);
            const errorMsg = error.response?.data?.detail || "Failed to process receipt.";
            toast.update(processingToastId, {
                render: `Error: ${errorMsg}`, type: "error", isLoading: false, autoClose: 5000,
            });
        } finally {
            setIsProcessingReceipt(false);
        }
    };


  if (authIsLoading) {
    return <div className="app-container"><p className="loading-message">Loading dashboard...</p></div>;
  }

  // Handle case where user profile fetch failed but auth isn't loading anymore
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
              onScan={handleReceiptScan}
          />
      )}
      {isProcessingReceipt && <div className="loading-indicator">Processing Receipt...</div>}


      {/* Main Dashboard Layout */}
      <div className={`app-container ${isProcessingReceipt ? 'processing-overlay' : ''}`}>
        {/* Simple Header */}
        <div className="page-header">
            <h1>Dashboard</h1>
            {/* Optionally add a date or subtitle */}
        </div>

        {/* Grid for Dashboard Modules */}
        <div className="dashboard-grid">
            {/* Place modules in the desired grid order */}
            <WelcomeStats />
            <QuickActions
                onScanBarcode={() => setIsBarcodeScannerOpen(true)}
                onScanReceipt={() => setIsReceiptScannerOpen(true)}
                allSpecials={allSpecials} // Pass specials down
            />
            {/* --- UPDATED: Pass allSpecials to MealPlanPreview --- */}
            <MealPlanPreview allSpecials={allSpecials} />
            <PantrySnapshot />
            <BudgetSummary allSpecials={allSpecials} /> {/* Pass specials down */}
            <RecentActivity />
            {/* Add more modules here as needed */}
        </div>
      </div>
    </>
  );
};
export default DashboardPage;