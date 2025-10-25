// src/components/ShoppingList.jsx

import React, { useState, useEffect, useMemo } from 'react';
// --- REMOVED: axios import ---
import { useAuth } from '../context/AuthContext';
// --- UPDATED: Import the new fuzzy matching function ---
import { getSimplePrice, findBestSpecialMatch } from '../utils/priceUtils';
import './ShoppingList.css';

// --- *** UPDATED: Accept recipes prop and isEmbedded prop *** ---
const ShoppingList = ({ allSpecials, recipes: recipesProp, isEmbedded = false }) => {
    const { 
        selectedRecipes: globalRecipes, // Renamed to avoid conflict
        userProfile, 
        clearShoppingList,
        removeIngredientFromList, // --- FIX: Use the new function from context ---
        pantryIdSet // --- NEW: Get pantryIdSet from context ---
    } = useAuth();
    
    // --- *** UPDATED: Use recipesProp if provided, else use globalRecipes *** ---
    const recipesToDisplay = recipesProp || globalRecipes;
    
    const [checkedItems, setCheckedItems] = useState(() => JSON.parse(localStorage.getItem('checkedItems') || '[]'));
    
    // --- NEW: State for overrides (no change) ---
    const [forceBuyIds, setForceBuyIds] = useState(new Set()); // IDs to "buy anyway"
    
    useEffect(() => { localStorage.setItem('checkedItems', JSON.stringify(checkedItems)); }, [checkedItems]);

    // --- REMOVED: useEffect for fetching pantry items ---
    
    // --- REMOVED: useMemo for local pantryIdSet ---

    const shoppingListData = useMemo(() => {
        // --- *** UPDATED: Check recipesToDisplay *** ---
        if (!recipesToDisplay || recipesToDisplay.length === 0) {
            // --- UPDATED: Return all parts of the data structure ---
            return { consolidatedItems: [], itemsToBuy: [], itemsInPantry: [], totalCost: 0 };
        }

        const itemsMap = new Map();

        // --- *** UPDATED: Iterate over recipesToDisplay *** ---
        recipesToDisplay.forEach(({ recipe, quantity }) => {
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
        
        // --- NEW: Partition the list ---
        const itemsToBuy = [];
        const itemsInPantry = [];
        
        for (const item of consolidatedItems) {
            if (forceBuyIds.has(item.id)) {
                itemsToBuy.push(item); // User forced it to the buy list
            } else if (pantryIdSet.has(item.id) && !isEmbedded) { // Check global pantryIdSet
                itemsInPantry.push(item); // Item is in pantry
            } else {
                itemsToBuy.push(item); // Not in pantry, or this is an embedded list
            }
        }
        // --- END NEW ---

        // --- UPDATED: Calculate cost from itemsToBuy only ---
        const totalCost = itemsToBuy.reduce((total, item) => {
            if (item.priceString) {
                return total + (getSimplePrice(item.priceString) * item.count);
            }
            return total;
        }, 0);

        // --- UPDATED: Return partitioned lists and new cost ---
        return { itemsToBuy, itemsInPantry, totalCost };

    // --- *** UPDATED: Dependency is now recipesToDisplay, pantryIdSet, forceBuyIds, isEmbedded *** ---
    }, [recipesToDisplay, allSpecials, pantryIdSet, forceBuyIds, isEmbedded]);

    // --- UPDATED: Destructure new lists ---
    const { itemsToBuy, itemsInPantry, totalCost } = shoppingListData;

    const handleCheckItem = (itemId) => {
      if (checkedItems.includes(itemId)) {
        setCheckedItems(checkedItems.filter(id => id !== itemId));
      } else {
        setCheckedItems([...checkedItems, itemId]);
      }
    };
    
    // --- FIX for 'Clear All' button ---
    const handleClearAll = () => {
      if (window.confirm('Are you sure you want to clear your entire shopping list?')) {
        clearShoppingList();
      }
    };

    // --- NEW: Handlers to move items between lists (no change) ---
    const handleMoveToBuyList = (itemId) => {
        setForceBuyIds(prev => new Set(prev).add(itemId));
    };
    const handleMoveToPantry = (itemId) => {
        setForceBuyIds(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
        });
    };
    // --- END NEW ---

    const budget = userProfile?.weekly_budget;
    const budgetPercentage = (budget && budget > 0) ? (totalCost / budget) : 0;

    return (
        <div className="shopping-list-container">
            {/* --- *** UPDATED: Conditionally show header *** --- */}
            {!isEmbedded && (
                <div className="shopping-list-header">
                    <h2>Shopping List</h2>
                    <button onClick={handleClearAll} className="clear-all-btn">Clear All</button>
                </div>
            )}

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
            
            {/* --- UPDATED: Check itemsToBuy and itemsInPantry --- */}
            {itemsToBuy.length === 0 && itemsInPantry.length === 0 ? (
                <p>Select recipes to start your list.</p>
            ) : (
                <>
                    {/* --- UPDATED: Map over itemsToBuy --- */}
                    <ul>
                        {itemsToBuy.sort((a, b) => a.name.localeCompare(b.name)).map(item => {
                            const isChecked = checkedItems.includes(item.id);
                            const lineItemPrice = item.priceString ? getSimplePrice(item.priceString) * item.count : 0;
                            const wasForceAdded = forceBuyIds.has(item.id); // Check if it was forced
                            return (
                                <li key={item.id} className={isChecked ? 'checked' : ''}>
                                    <label className="checkbox-label">
                                        {/* --- *** UPDATED: Conditionally show checkbox *** --- */}
                                        {!isEmbedded && (
                                            <input type="checkbox" checked={isChecked} onChange={() => handleCheckItem(item.id)} />
                                        )}
                                        <strong>{item.name}</strong>
                                    </label>
                                    <div className="item-details">
                                      {item.count > 1 && <span className="item-quantity">({item.count})</span>}
                                      {lineItemPrice > 0 && <span className="item-price">${lineItemPrice.toFixed(2)}</span>}
                                      {/* --- *** UPDATED: Conditional Button *** --- */}
                                      {!isEmbedded && (
                                          wasForceAdded ? (
                                            <button className="move-to-pantry-btn" title="Move back to pantry" onClick={() => handleMoveToPantry(item.id)}>↩️</button>
                                          ) : (
                                            <button className="remove-item-btn" onClick={() => removeIngredientFromList(item.id)}>×</button>
                                          )
                                      )}
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

            {/* --- NEW: "Already in Pantry" section --- */}
            {!isEmbedded && itemsInPantry.length > 0 && (
                <div className="pantry-items-section">
                    <h4>Already in your pantry:</h4>
                    <ul className="pantry-item-list-ul">
                        {itemsInPantry.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                            <li key={item.id} className="pantry-item-in-list">
                                <span>{item.name} {item.count > 1 ? `(${item.count})` : ''}</span>
                                <button onClick={() => handleMoveToBuyList(item.id)} className="move-to-list-btn">
                                    Add to list
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* --- END NEW --- */}
        </div>
    );
};

export default ShoppingList;