// src/components/dashboard/BudgetSummary.jsx
import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { parsePrice } from '../../utils/priceUtils';
// --- FIX: Removed broken import for 'findBestSpecialMatch' ---
// import { parsePrice, findBestSpecialMatch } from '../../utils/priceUtils';
// --- END FIX ---

const BudgetSummary = ({ allSpecials }) => {
  const { userProfile, selectedRecipes, selectedSpecials } = useAuth();

  const budget = userProfile?.weekly_budget || 0;

  // --- FIX: Streamlined cost calculation ---
  
  // 1. Calculate cost of individually selected specials
  const costOfSelectedSpecials = useMemo(() => {
    return selectedSpecials.reduce((total, special) => {
      const price = parsePrice(special.price);
      return total + (price || 0);
    }, 0);
  }, [selectedSpecials]);

  // 2. --- REMOVED: Broken logic for 'costOfSelectedRecipes' ---
  // This logic was incomplete and relied on the missing function.
  // We will rely on the Shopping List's total cost for now.

  // 3. Set total cost
  // For now, this module will only reflect the cost of *individually added* specials.
  // The main "Est. Total" in the Shopping List itself remains the source of truth.
  const totalCost = costOfSelectedSpecials;
  // --- END FIX ---

  const budgetDifference = budget - totalCost;

  return (
    <div className="dashboard-module budget-summary-module">
      <h3>Budget Summary</h3>
      {budget > 0 ? (
        <>
          <div className="budget-bar-container">
            <div
              className="budget-bar-filled"
              style={{ width: `${Math.min((totalCost / budget) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="budget-text">
            <span className="budget-used">${totalCost.toFixed(2)}</span>
            <span className="budget-total"> of ${budget.toFixed(2)}</span>
          </div>
          <p className={`budget-remaining ${budgetDifference < 0 ? 'over-budget' : ''}`}>
            {budgetDifference < 0
              ? `$${Math.abs(budgetDifference).toFixed(2)} over budget`
              : `$${budgetDifference.toFixed(2)} remaining`}
          </p>
        </>
      ) : (
        <p>
          You haven't set a weekly budget yet.
          <Link to="/profile">Set one in your profile!</Link>
        </p>
      )}
    </div>
  );
};

export default BudgetSummary;