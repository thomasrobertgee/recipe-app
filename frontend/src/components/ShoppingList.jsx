// src/components/ShoppingList.jsx

import React, { useMemo } from 'react';
import './ShoppingList.css';

const ShoppingList = ({ selectedRecipes }) => {

  const consolidatedList = useMemo(() => {
    const ingredientMap = new Map();

    selectedRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        const key = ingredient.name.toLowerCase();

        // Regex to find a number (integer or decimal) and the unit
        const quantityMatch = ingredient.quantity.match(/^(\d*\.?\d+)\s*(.*)$/);
        
        if (!ingredientMap.has(key)) {
          // If this is the first time we see this ingredient, create its entry
          ingredientMap.set(key, { name: ingredient.name, items: [] });
        }

        if (quantityMatch) {
          // If we found a number (e.g., "2", "large")
          const value = parseFloat(quantityMatch[1]);
          const unit = quantityMatch[2].trim().toLowerCase();

          // Find if we already have an entry with the same unit
          const existingItem = ingredientMap.get(key).items.find(item => item.unit === unit);

          if (existingItem) {
            // If yes, just add the new value to the total
            existingItem.total += value;
          } else {
            // If no, add a new entry for this unit
            ingredientMap.get(key).items.push({ total: value, unit: unit });
          }
        } else {
          // If no number was found (e.g., "a pinch"), treat the whole quantity as the unit
          const unit = ingredient.quantity.trim().toLowerCase();
          const existingItem = ingredientMap.get(key).items.find(item => item.unit === unit);

          if (existingItem) {
            existingItem.total += 1; // e.g., "a pinch" + "a pinch" = "2 a pinch"
          } else {
            ingredientMap.get(key).items.push({ total: 1, unit: unit });
          }
        }
      });
    });

    return Array.from(ingredientMap.values());
  }, [selectedRecipes]);

  return (
    <div className="shopping-list-container">
      <h2>Shopping List</h2>
      {consolidatedList.length === 0 ? (
        <p>Select some recipes to get started!</p>
      ) : (
        <ul>
          {consolidatedList.map(item => (
            <li key={item.name}>
              <strong>{item.name}</strong>
              {/* Join the different unit groups for the same ingredient */}
              <span>
                {item.items.map(subItem => `${subItem.total} ${subItem.unit}`).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ShoppingList;