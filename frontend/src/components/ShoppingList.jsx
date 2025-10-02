// src/components/ShoppingList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import './ShoppingList.css';

const ShoppingList = ({ selectedRecipes }) => {
  // --- NEW: State to track checked items, initialized from localStorage ---
  const [checkedItems, setCheckedItems] = useState(() => {
    const saved = localStorage.getItem('checkedItems');
    return saved ? JSON.parse(saved) : [];
  });

  // --- NEW: Effect to save checked items to localStorage whenever they change ---
  useEffect(() => {
    localStorage.setItem('checkedItems', JSON.stringify(checkedItems));
  }, [checkedItems]);

  const consolidatedList = useMemo(() => {
    const ingredientMap = new Map();
    selectedRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        const key = ingredient.name.toLowerCase();
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, { name: ingredient.name, items: [] });
        }
        const quantityMatch = ingredient.quantity.match(/^(\d*\.?\d+)\s*(.*)$/);
        if (quantityMatch) {
          const value = parseFloat(quantityMatch[1]);
          const unit = quantityMatch[2].trim().toLowerCase();
          const existingItem = ingredientMap.get(key).items.find(item => item.unit === unit);
          if (existingItem) {
            existingItem.total += value;
          } else {
            ingredientMap.get(key).items.push({ total: value, unit: unit });
          }
        } else {
          const unit = ingredient.quantity.trim().toLowerCase();
          const existingItem = ingredientMap.get(key).items.find(item => item.unit === unit);
          if (existingItem) {
            existingItem.total += 1;
          } else {
            ingredientMap.get(key).items.push({ total: 1, unit: unit });
          }
        }
      });
    });
    return Array.from(ingredientMap.values());
  }, [selectedRecipes]);

  // --- NEW: Function to handle checking/unchecking an item ---
  const handleCheckItem = (itemName) => {
    const key = itemName.toLowerCase();
    if (checkedItems.includes(key)) {
      setCheckedItems(checkedItems.filter(item => item !== key));
    } else {
      setCheckedItems([...checkedItems, key]);
    }
  };

  return (
    <div className="shopping-list-container">
      <h2>Shopping List</h2>
      {consolidatedList.length === 0 ? (
        <p>Select some recipes to get started!</p>
      ) : (
        <ul>
          {consolidatedList.map(item => {
            // --- NEW: Check if the current item is in our checkedItems state ---
            const isChecked = checkedItems.includes(item.name.toLowerCase());
            
            return (
              // --- NEW: Add a dynamic 'checked' class to the list item ---
              <li key={item.name} className={isChecked ? 'checked' : ''}>
                <label className="checkbox-label">
                  {/* --- NEW: The checkbox input --- */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckItem(item.name)}
                  />
                  <strong>{item.name}</strong>
                </label>
                <span>
                  {item.items.map(subItem => `${subItem.total} ${subItem.unit}`).join(', ')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ShoppingList;