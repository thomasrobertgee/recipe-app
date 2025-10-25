// src/components/dashboard/MealPlanPreview.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
// --- UPDATED: Import RecipeCard instead of RecipeTile ---
import RecipeCard from '../RecipeCard';
// --- NEW: Import RecipeDetail for modal ---
import RecipeDetail from '../RecipeDetail';
// --- NEW: Import useAuth for rate handling ---
import { useAuth } from '../../context/AuthContext';
import './DashboardModule.css';

// Helper function to get local YYYY-MM-DD string
const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const MealPlanPreview = ({ allSpecials }) => { // --- Added allSpecials prop ---
    const [mealPlan, setMealPlan] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // --- NEW: State for selected recipe modal ---
    const [selectedRecipeDetail, setSelectedRecipeDetail] = useState(null);
    // --- NEW: Get rate handler from context ---
    const { fetchSavedRecipes } = useAuth(); // Needed if rating affects saved status potentially

    // --- NEW: Basic rate handler (could be enhanced later) ---
    const handleRateRecipe = async (recipeId, rating) => {
        try {
            // Re-use API call logic, maybe abstract this later
            await axios.post(`/api/recipes/${recipeId}/rate`, { rating });
            // Refresh saved recipes if needed, or update local state if applicable
            // For simplicity, just close modal for now
            setSelectedRecipeDetail(null);
            // Optionally refetch meal plan if rating changes affect anything displayed
            // fetchMealPlan(); // You'd need to define fetchMealPlan if using here
        } catch (error) {
            console.error("Error rating recipe from dashboard:", error);
        }
    };


    useEffect(() => {
        axios.get('/api/meal-plan')
            .then(res => {
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const todayLocalString = getLocalDateString(today);
                const tomorrowLocalString = getLocalDateString(tomorrow);
                const upcoming = res.data.filter(entry =>
                    entry.plan_date === todayLocalString || entry.plan_date === tomorrowLocalString
                );
                setMealPlan(upcoming);
            })
            .catch(err => console.error("Failed to fetch meal plan preview:", err))
            .finally(() => setIsLoading(false));
    }, []);

    const planByDay = useMemo(() => {
        const todayLocalString = getLocalDateString(new Date());
        return mealPlan.reduce((acc, entry) => {
            const dayLabel = entry.plan_date === todayLocalString ? "Today" : "Tomorrow";
            if (!acc[dayLabel]) acc[dayLabel] = [];
            acc[dayLabel].push(entry);
            return acc;
        }, {});
    }, [mealPlan]);

    return (
        <div className="dashboard-module">
            <div className="module-header">
                <h2>Upcoming Meals</h2>
                <Link to="/meal-plan" className="module-link">View Full Plan →</Link>
            </div>
            {isLoading ? (
                <p>Loading meal plan...</p>
            ) : mealPlan.length === 0 ? (
                <p>No meals planned for today or tomorrow. <Link to="/meal-plan">Plan your week!</Link></p>
            ) : (
                <div className="meal-plan-preview-content">
                    {Object.entries(planByDay).sort(([dayA], [dayB]) => dayA === 'Today' ? -1 : 1)
                        .map(([dayLabel, entries]) => (
                        <div key={dayLabel} className="preview-day">
                            <h4>{dayLabel}</h4>
                            {entries.map(entry => (
                                // --- UPDATED: Use RecipeCard ---
                                <RecipeCard
                                    key={entry.id}
                                    recipe={entry.recipe}
                                    allSpecials={allSpecials} // Pass specials for cost
                                    // Make card clickable to open detail modal
                                    onClick={() => setSelectedRecipeDetail(entry.recipe)}
                                    // Remove onDelete prop as it doesn't make sense here
                                    // Add onRate if needed, but might be overkill for dashboard
                                />
                                // --- END UPDATED ---
                            ))}
                        </div>
                    ))}
                </div>
            )}
            {/* --- NEW: Render RecipeDetail modal --- */}
            {selectedRecipeDetail && (
                <RecipeDetail
                    recipe={selectedRecipeDetail}
                    onClose={() => setSelectedRecipeDetail(null)}
                    allSpecials={allSpecials}
                    onRate={handleRateRecipe} // Pass rate handler
                    // Add other props like savedRecipes if needed by RecipeDetail
                />
            )}
        </div>
    );
};

export default MealPlanPreview;