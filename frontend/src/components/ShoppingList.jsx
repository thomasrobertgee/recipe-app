// src/components/ShoppingList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { calculateRecipeCost } from '../utils/priceUtils';
import './ShoppingList.css';

const findBestSpecialMatch = (ingredientName, allSpecials) => {
  const lowerCaseIngredient = ingredientName.toLowerCase();
  const searchRegex = new RegExp(`\\b${lowerCaseIngredient}\\b`, 'i');

  const exactMatch = allSpecials.find(s => s.ingredient_name.toLowerCase() === lowerCaseIngredient);
  if (exactMatch) return exactMatch;

  const wholeWordMatch = allSpecials.find(s => searchRegex.test(s.ingredient_name));
  if (wholeWordMatch) return wholeWordMatch;
  
  return allSpecials.find(s => s.ingredient_name.toLowerCase().includes(lowerCaseIngredient));
};


const ShoppingList = ({ allSpecials }) => {
    const { 
      selectedRecipes, 
      userProfile, 
      removedItems, 
      handleRemoveShoppingListItem, 
      handleAddShoppingListItem 
    } = useAuth();
    
    const [checkedItems, setCheckedItems] = useState(() => JSON.parse(localStorage.getItem('checkedItems') || '[]'));
    
    useEffect(() => { localStorage.setItem('checkedItems', JSON.stringify(checkedItems)); }, [checkedItems]);

    const shoppingListData = useMemo(() => {
      if (!allSpecials || selectedRecipes.length === 0) {
        return { visibleItems: [], removedListItems: [], totalCost: 0 };
      }

      const allItems = [];
      selectedRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          const special = findBestSpecialMatch(ingredient.name, allSpecials);
          
          allItems.push({
            id: `${special ? special.ingredient_name : ingredient.name}-${recipe.id}`,
            name: special ? special.ingredient_name : ingredient.name,
            priceString: special ? special.price : 'N/A',
            recipeId: recipe.id,
            recipeTitle: recipe.title
          });
        });
      });
      
      const visibleItems = allItems.filter(item => !removedItems.includes(item.id));
      const removedListItems = allItems.filter(item => removedItems.includes(item.id));
      
      const cost = calculateRecipeCost(selectedRecipes, allSpecials, removedItems);

      return { visibleItems, removedListItems, totalCost: cost };

    }, [selectedRecipes, allSpecials, removedItems]);

    const { visibleItems, removedListItems, totalCost } = shoppingListData;

    const handleCheckItem = (itemId) => {
      if (checkedItems.includes(itemId)) {
        setCheckedItems(checkedItems.filter(id => id !== itemId));
      } else {
        setCheckedItems([...checkedItems, itemId]);
      }
    };
    
    const budget = userProfile?.weekly_budget;
    const budgetPercentage = budget ? (totalCost / budget) * 100 : 0;

    return (
        <div className="shopping-list-container">
            <div className="shopping-list-header">
                <h2>Shopping List</h2>
                {budget > 0 && (
                  <div className="budget-tracker">
                    <div className="budget-info">
                      <span>Budget: ${budget.toFixed(2)}</span>
                      <span>{budgetPercentage.toFixed(0)}% Used</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
            </div>
            
            {visibleItems.length === 0 && removedListItems.length === 0 ? (
                <p>Select recipes to start your list.</p>
            ) : (
                <>
                    <ul>
                        {visibleItems.map(item => {
                            const isChecked = checkedItems.includes(item.id);
                            return (
                                <li key={item.id} className={isChecked ? 'checked' : ''}>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={isChecked} onChange={() => handleCheckItem(item.id)} />
                                        <div>
                                          <strong>{item.name}</strong>
                                          <span className="recipe-source">from "{item.recipeTitle}"</span>
                                        </div>
                                    </label>
                                    <div className="item-details">
                                      <span className="item-price">{item.priceString}</span>
                                      {/* THIS IS THE CRITICAL FIX: Calls the correct function */}
                                      <button className="remove-item-btn" onClick={() => handleRemoveShoppingListItem(item.id)}>×</button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {removedListItems.length > 0 && (
                      <div className="removed-items-section">
                        <h4>Removed Items</h4>
                        <ul>
                          {removedListItems.map(item => (
                            <li key={item.id} className="removed-item">
                              <span>{item.name}</span>
                              <button className="add-item-btn" onClick={() => handleAddShoppingListItem(item.id)}>Re-add</button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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