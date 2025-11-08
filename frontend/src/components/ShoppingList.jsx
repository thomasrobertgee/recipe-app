// src/components/ShoppingList.jsx
import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { parsePrice } from '../utils/priceUtils';
import './ShoppingList.css';

const ShoppingList = () => {
  const {
    userProfile,
    selectedRecipes,
    selectedSpecials, // <-- NEW: Get selected specials
    handleSelectSpecial, // <-- NEW: Get handler for specials
    clearShoppingList,
    pantryIdSet,
    handleSelectRecipe,
  } = useAuth();

  const [itemsInPantry, setItemsInPantry] = useState(new Set());

  // --- UPDATED: Consolidate ingredients from recipes AND specials ---
  const consolidatedList = useMemo(() => {
    const ingredients = {};

    // 1. Process ingredients from selected recipes
    selectedRecipes.forEach(({ recipe, quantity }) => {
      recipe.ingredients.forEach(ing => {
        const key = ing.ingredient_id || ing.name.toLowerCase();
        if (!ingredients[key]) {
          ingredients[key] = {
            id: ing.ingredient_id,
            name: ing.name,
            quantity: [],
            recipes: [],
            price: null, // We don't know the price from recipes
            category: null, // We don't know the category from recipes
            isSpecial: false,
          };
        }
        ingredients[key].quantity.push(`${ing.quantity} (for ${recipe.title} x${quantity})`);
        ingredients[key].recipes.push(recipe.title);
      });
    });

    // 2. Process individually selected specials
    selectedSpecials.forEach(special => {
      const key = special.ingredient_id;
      if (!ingredients[key]) {
        // This is a new item, add it from the special
        ingredients[key] = {
          id: special.ingredient_id,
          name: special.ingredient_name,
          quantity: ["1"], // Default quantity for an individual special
          recipes: ["On Special"], // Mark it as an individual item
          price: parsePrice(special.price), // <-- Get price
          category: special.category,
          isSpecial: true,
          specialDetails: special, // Store the full special object
        };
      } else {
        // This ingredient was already in the list from a recipe
        // We can now update its price if we didn't have one
        if (!ingredients[key].price) {
           ingredients[key].price = parsePrice(special.price);
        }
        // Add a note that it's also on special
        ingredients[key].recipes.push("On Special");
        ingredients[key].isSpecial = true;
        ingredients[key].specialDetails = special;
      }
    });


    // 3. Check against pantry
    const pantryIds = pantryIdSet;
    const initialInPantry = new Set();
    Object.values(ingredients).forEach(item => {
      if (pantryIds.has(item.id)) {
        initialInPantry.add(item.id);
      }
    });
    setItemsInPantry(initialInPantry);

    return Object.values(ingredients).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedRecipes, selectedSpecials, pantryIdSet]);
  // --- END UPDATED ---

  const handlePantryToggle = (itemId) => {
    setItemsInPantry(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const listToBuy = consolidatedList.filter(item => !itemsInPantry.has(item.id));
  const listInPantry = consolidatedList.filter(item => itemsInPantry.has(item.id));

  // --- UPDATED: Total cost calculation ---
  const totalCost = useMemo(() => {
    let cost = 0;
    // Only add cost for items we actually intend to buy
    listToBuy.forEach(item => {
      if (item.price) { // Price is now available for specials
        cost += item.price;
      }
    });
    return cost;
  }, [listToBuy]);
  // --- END UPDATED ---

  const budget = userProfile?.weekly_budget || 0;
  const budgetDifference = budget - totalCost;

  return (
    <div className="shopping-list-container">
      <h3>Intelligent Shopping List</h3>

      {selectedRecipes.length === 0 && selectedSpecials.length === 0 ? (
        <p className="empty-list-message">Your list is empty. Add recipes or specials to get started!</p>
      ) : (
        <>
          <div className="budget-tracker">
            <div className={`budget-total ${budgetDifference < 0 ? 'over-budget' : ''}`}>
              Est. Total: <strong>${totalCost.toFixed(2)}</strong>
            </div>
            {budget > 0 && (
              <div className="budget-remaining">
                Budget: ${budget.toFixed(2)} | Remaining: <strong>${budgetDifference.toFixed(2)}</strong>
              </div>
            )}
          </div>

          <button onClick={clearShoppingList} className="clear-list-btn">
            Clear Full List
          </button>

          {/* --- Section for items to buy --- */}
          <h4>To Buy ({listToBuy.length})</h4>
          <ul className="list-section list-to-buy">
            {listToBuy.map(item => (
              <li key={item.id} className="shopping-list-item">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handlePantryToggle(item.id)}
                  title="Move to pantry"
                />
                <span className="item-name">{item.name}</span>
                {item.price && (
                  <span className="item-price">${item.price.toFixed(2)}</span>
                )}
                <div className="item-details">
                  {item.isSpecial ? (
                    <span className="item-source special-source">
                      {item.specialDetails.store}: {item.specialDetails.price}
                    </span>
                  ) : (
                     item.recipes.map((recipeName, index) => (
                       <span key={index} className="item-source recipe-source">
                         from {recipeName}
                       </span>
                     ))
                  )}
                </div>
                 {/* --- NEW: Button to remove individual special --- */}
                {item.isSpecial && item.recipes.length === 1 && item.recipes[0] === "On Special" && (
                   <button
                       onClick={() => handleSelectSpecial(item.specialDetails)}
                       className="remove-special-btn"
                       title="Remove this special"
                   >
                       &times;
                   </button>
                )}
              </li>
            ))}
          </ul>

          {/* --- Section for items already in pantry --- */}
          {listInPantry.length > 0 && (
            <>
              <h4>Already in pantry ({listInPantry.length})</h4>
              <ul className="list-section list-in-pantry">
                {listInPantry.map(item => (
                  <li key={item.id} className="shopping-list-item in-pantry">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handlePantryToggle(item.id)}
                      title="Move back to list"
                    />
                    <span className="item-name">{item.name}</span>
                     {/* --- NEW: Button to remove individual special (from pantry section) --- */}
                    {item.isSpecial && item.recipes.length === 1 && item.recipes[0] === "On Special" && (
                       <button
                           onClick={() => handleSelectSpecial(item.specialDetails)}
                           className="remove-special-btn"
                           title="Remove this special"
                       >
                           &times;
                       </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* --- Section to show selected recipes (no change) --- */}
          {selectedRecipes.length > 0 && (
             <div className="selected-recipes-summary">
                <h4>From Recipes:</h4>
                <ul>
                  {selectedRecipes.map(({ recipe }) => (
                    <li key={recipe.id}>
                      <span>{recipe.title}</span>
                      <button
                        onClick={() => handleSelectRecipe(recipe)}
                        className="remove-recipe-btn"
                        title="Remove recipe from list"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
             </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShoppingList;