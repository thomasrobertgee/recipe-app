// src/components/ShoppingList.jsx

import React, { useMemo } from 'react';
import './ShoppingList.css';

const ShoppingList = ({ selectedRecipes }) => {

  // useMemo will re-calculate the list only when selectedRecipes changes
  const consolidatedList = useMemo(() => {
    const ingredientMap = new Map();

    selectedRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        const key = ingredient.name.toLowerCase();
        if (ingredientMap.has(key)) {
          // Just append the new quantity for now
          // Note: True quantity consolidation (e.g., 1 cup + 2 cups) is a complex v2 feature.
          ingredientMap.get(key).quantities.push(ingredient.quantity);
        } else {
          ingredientMap.set(key, { 
            name: ingredient.name, 
            quantities: [ingredient.quantity] 
          });
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
              <span>{item.quantities.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ShoppingList;