// src/components/ShoppingList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
// --- UPDATED: Import the new fuzzy matching function ---
import { getSimplePrice, findBestSpecialMatch } from '../utils/priceUtils';
import './ShoppingList.css';

const ShoppingList = ({ allSpecials }) => {
    const { 
      selectedRecipes, 
      userProfile, 
      clearShoppingList,
      decrementRecipeQuantity 
    } = useAuth();
    
    const [checkedItems, setCheckedItems] = useState(() => JSON.parse(localStorage.getItem('checkedItems') || '[]'));
    
    useEffect(() => { localStorage.setItem('checkedItems', JSON.stringify(checkedItems)); }, [checkedItems]);

    const shoppingListData = useMemo(() => {
        if (!selectedRecipes || selectedRecipes.length === 0) {
            return { consolidatedItems: [], totalCost: 0 };
        }

        const itemsMap = new Map();

        selectedRecipes.forEach(({ recipe, quantity }) => {
            recipe.ingredients.forEach(ingredient => {
                // --- THIS IS THE FIX ---
                // Use our new "fuzzy match" function instead of a strict ID match.
                const special = findBestSpecialMatch(ingredient.name, allSpecials);
                const existingItem = itemsMap.get(ingredient.ingredient_id);

                if (existingItem) {
                    existingItem.count += quantity;
                    existingItem.recipeIds.add(recipe.id);
                } else {
                    itemsMap.set(ingredient.ingredient_id, {
                        id: ingredient.ingredient_id,
                        name: ingredient.name,
                        priceString: special ? special.price : null,
                        count: quantity,
                        recipeIds: new Set([recipe.id]),
                    });
                }
            });
        });
        
        const consolidatedItems = Array.from(itemsMap.values());

        const totalCost = consolidatedItems.reduce((total, item) => {
            if (item.priceString) {
                return total + (getSimplePrice(item.priceString) * item.count);
            }
            return total;
        }, 0);

        return { consolidatedItems, totalCost };

    }, [selectedRecipes, allSpecials]);

    const { consolidatedItems, totalCost } = shoppingListData;

    const handleCheckItem = (itemId) => {
      if (checkedItems.includes(itemId)) {
        setCheckedItems(checkedItems.filter(id => id !== itemId));
      } else {
        setCheckedItems([...checkedItems, itemId]);
      }
    };
    
    const handleRemoveItem = (item) => {
      const recipeIdToRemoveFrom = Array.from(item.recipeIds)[0];
      if(recipeIdToRemoveFrom) {
        decrementRecipeQuantity(recipeIdToRemoveFrom);
      }
    };

    const budget = userProfile?.weekly_budget;
    const budgetPercentage = (budget && budget > 0) ? (totalCost / budget) : 0;

    return (
        <div className="shopping-list-container">
            <div className="shopping-list-header">
                <h2>Shopping List</h2>
                <button onClick={clearShoppingList} className="clear-all-btn">Clear All</button>
            </div>

            {budget > 0 && (
              <div className="budget-tracker">
                <div className="budget-info">
                  <span>Budget: ${budget.toFixed(2)}</span>
                  <span>{(budgetPercentage * 100).toFixed(0)}% Used</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${Math.min(budgetPercentage * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {consolidatedItems.length === 0 ? (
                <p>Select recipes to start your list.</p>
            ) : (
                <>
                    <ul>
                        {consolidatedItems.sort((a, b) => a.name.localeCompare(b.name)).map(item => {
                            const isChecked = checkedItems.includes(item.id);
                            const lineItemPrice = item.priceString ? getSimplePrice(item.priceString) * item.count : 0;
                            return (
                                <li key={item.id} className={isChecked ? 'checked' : ''}>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={isChecked} onChange={() => handleCheckItem(item.id)} />
                                        <strong>{item.name}</strong>
                                    </label>
                                    <div className="item-details">
                                      {item.count > 1 && <span className="item-quantity">({item.count})</span>}
                                      {lineItemPrice > 0 && <span className="item-price">${lineItemPrice.toFixed(2)}</span>}
                                      <button className="remove-item-btn" onClick={() => handleRemoveItem(item)}>×</button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="total-cost-section">
                        <strong>Total Estimated Cost:</strong>
                        <span>${totalCost.toFixed(2)}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default ShoppingList;