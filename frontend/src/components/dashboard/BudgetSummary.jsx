// src/components/dashboard/BudgetSummary.jsx
import React, { useMemo } from 'react';
// --- NEW: Import Link ---
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getSimplePrice, findBestSpecialMatch } from '../../utils/priceUtils'; // Need price utils
import './DashboardModule.css';
import '../ShoppingList.css'; // Re-use shopping list CSS for budget bar

const BudgetSummary = ({ allSpecials }) => { // Needs allSpecials
    const { userProfile, selectedRecipes } = useAuth();
    const { toggleSidebar } = useUI();

    const totalCost = useMemo(() => {
        // Calculate cost based only on items NOT in pantry (like in ShoppingList)
        // For simplicity here, we'll calculate based on all selected recipes.
        // A more accurate version would need pantryIdSet from AuthContext too.
        if (!selectedRecipes || selectedRecipes.length === 0) return 0;

        const itemsMap = new Map();
        selectedRecipes.forEach(({ recipe, quantity }) => {
            recipe.ingredients.forEach(ingredient => {
                const special = findBestSpecialMatch(ingredient.name, allSpecials);
                const existingItem = itemsMap.get(ingredient.ingredient_id);
                if (existingItem) {
                    existingItem.count += quantity;
                } else {
                    itemsMap.set(ingredient.ingredient_id, {
                        id: ingredient.ingredient_id,
                        priceString: special ? special.price : null,
                        count: quantity,
                    });
                }
            });
        });

        return Array.from(itemsMap.values()).reduce((total, item) => {
            if (item.priceString) {
                return total + (getSimplePrice(item.priceString) * item.count);
            }
            return total;
        }, 0);
    }, [selectedRecipes, allSpecials]); // Added allSpecials dependency

    const budget = userProfile?.weekly_budget;
    const budgetPercentage = (budget && budget > 0) ? (totalCost / budget) : 0;
    const isOverBudget = budgetPercentage > 1;

    return (
        <div className="dashboard-module">
            <div className="module-header">
                <h2>Shopping List Cost</h2>
                <button onClick={toggleSidebar} className="module-link button-link">View List →</button>
            </div>
            {!budget || budget <= 0 ? (
                 <p>Set a weekly budget in your <Link to="/profile">profile</Link> to track spending.</p> // Error was here
            ) : (
                <div className="budget-summary-content">
                    <div className="budget-info">
                      <span>List Cost: ${totalCost.toFixed(2)}</span>
                      <span>Budget: ${budget.toFixed(2)}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar"
                        style={{
                            width: `${Math.min(budgetPercentage * 100, 100)}%`,
                            backgroundColor: isOverBudget ? '#dc3545' : '#4caf50' // Red if over budget
                        }}
                      ></div>
                    </div>
                    {isOverBudget && <p className="budget-warning-text">You are over budget!</p>}
                </div>
            )}
        </div>
    );
};

export default BudgetSummary;