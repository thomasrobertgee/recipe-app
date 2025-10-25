// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

// Import Dashboard Modules
import MealPlanPreview from '../components/dashboard/MealPlanPreview';
import PantrySnapshot from '../components/dashboard/PantrySnapshot';
import BudgetSummary from '../components/dashboard/BudgetSummary';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickActions from '../components/dashboard/QuickActions';
// --- Import Notifications Module ---
import NotificationsModule from '../components/dashboard/NotificationsModule';

// Import Modals
import BarcodeScanner from '../components/BarcodeScanner';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import OnboardingModal from '../components/OnboardingModal';

// Import CSS
import './Page.css';
import './DashboardPage.css';
import '../components/dashboard/DashboardModule.css';

const DashboardPage = ({ allSpecials }) => {
  const { userProfile, isLoading: authIsLoading, addPantryItem, fetchPantryItems } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  useEffect(() => {
    if (!authIsLoading && userProfile && userProfile.has_completed_onboarding === false) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [userProfile, authIsLoading]);

   const handleCloseOnboarding = () => {
        setShowOnboarding(false);
    };

    const handleScanSuccess = (productName) => {
        if (productName) addPantryItem(productName);
        setIsBarcodeScannerOpen(false);
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
            fetchPantryItems();
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
      {isBarcodeScannerOpen && <BarcodeScanner onClose={() => setIsBarcodeScannerOpen(false)} onScanSuccess={handleScanSuccess} />}
      {isReceiptScannerOpen && <ReceiptScannerModal onClose={() => setIsReceiptScannerOpen(false)} onScan={handleReceiptScan} />}
      {isProcessingReceipt && <div className="loading-indicator">Processing Receipt...</div>}

      <div className={`app-container ${isProcessingReceipt ? 'processing-overlay' : ''}`}>
        <div className="page-header"> <h1>Dashboard</h1> </div>

        <div className="dashboard-grid">
            <QuickActions
                onScanBarcode={() => setIsBarcodeScannerOpen(true)}
                onScanReceipt={() => setIsReceiptScannerOpen(true)}
                allSpecials={allSpecials}
            />
            {/* --- Added NotificationsModule --- */}
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