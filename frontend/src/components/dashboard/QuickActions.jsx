// src/components/dashboard/QuickActions.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // For generate action
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext'; // Need profile/pantry for generate
import './DashboardModule.css';

const QuickActions = ({ onScanBarcode, onScanReceipt, allSpecials }) => { // Receive specials
    const navigate = useNavigate();
    const { userProfile, pantryItems } = useAuth(); // Get user data
    const [isGenerating, setIsGenerating] = useState(false);

     const handleGenerateRecipes = async () => {
        if (!allSpecials || allSpecials.length === 0) {
          toast.error("There are no specials loaded to generate recipes from.");
          return;
        }
        if (!userProfile) {
            toast.error("User profile not loaded yet.");
            return;
        }

        setIsGenerating(true);
        const toastId = toast.loading("Asking the AI for recipes...");

        try {
          const payload = {
            specials: allSpecials, // Pass specials down from DashboardPage
            preferences: userProfile,
            pantry_items: pantryItems // Already available from AuthContext
          };

          const generateResponse = await axios.post('/api/generate-recipes', payload);
          toast.update(toastId, { render: generateResponse.data.message, type: "success", isLoading: false, autoClose: 5000 });
          // Optionally navigate to recipes page or refresh something
        } catch (error) {
          console.error("Error generating recipes:", error);
          toast.update(toastId, { render: "An error occurred while generating recipes.", type: "error", isLoading: false, autoClose: 5000 });
        } finally {
          setIsGenerating(false);
        }
    };


    return (
        <div className="dashboard-module">
            <h2>Quick Actions</h2>
            <div className="quick-actions-buttons">
                <button
                    onClick={handleGenerateRecipes}
                    className="quick-action-btn generate"
                    disabled={isGenerating}
                >
                    {isGenerating ? 'Generating...' : '✨ Generate Recipes'}
                </button>
                 <button onClick={() => navigate('/meal-plan')} className="quick-action-btn meal-plan">
                    📅 View Meal Plan
                </button>
                <button onClick={onScanBarcode} className="quick-action-btn scan-barcode">
                    📷 Scan Barcode
                </button>
                <button onClick={onScanReceipt} className="quick-action-btn scan-receipt">
                     🧾 Scan Receipt
                </button>
                 <button onClick={() => navigate('/pantry')} className="quick-action-btn pantry">
                    🧅 Manage Pantry
                </button>

            </div>
        </div>
    );
};

export default QuickActions;