// src/components/ShoppingList.jsx

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import './ShoppingList.css';

// --- NEW, FINAL PARSER ---
// This parser is built based on the exact data formats from your debug log.
const parsePrice = (priceString) => {
    if (!priceString || priceString === "N/A") {
        return { type: 'unparseable' };
    }

    // Priority 1: Check for a "per kg" rate. This is the most specific rule.
    // It looks for a number directly followed by "per 1kg".
    const rateMatch = priceString.match(/(\d+\.\d+)\s*per\s*1kg/i);
    if (rateMatch) {
        return { type: 'rate', rate: parseFloat(rateMatch[1]), unit: 'kg' };
    }

    // Priority 2: Check for a multi-buy deal.
    const multiBuyMatch = priceString.match(/(\d+)\s+for\s+\$(\d+\.?\d*)/);
    if (multiBuyMatch) {
        const quantity = parseInt(multiBuyMatch[1], 10);
        const price = parseFloat(multiBuyMatch[2]);
        if (quantity > 0) {
            return { type: 'unit', cost: price / quantity };
        }
    }

    // Priority 3: Fallback for any other price format, like "$1.50 each".
    // We'll just grab the first dollar value we see.
    const unitMatch = priceString.match(/\$(\d+\.?\d*)/);
    if (unitMatch) {
        return { type: 'unit', cost: parseFloat(unitMatch[1]) };
    }

    // If no rules match, we can't parse it.
    return { type: 'unparseable', text: priceString };
};


const ShoppingList = ({ selectedRecipes, allSpecials }) => {
    const [checkedItems, setCheckedItems] = useState(() => {
        const saved = localStorage.getItem('checkedItems');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('checkedItems', JSON.stringify(checkedItems));
    }, [checkedItems]);

    const consolidatedList = useMemo(() => {
        if (!allSpecials || allSpecials.length === 0) return [];
        const ingredientMap = new Map();
        selectedRecipes.forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
                if (!ingredient || !ingredient.name || !ingredient.quantity) { return; }
                const key = ingredient.name.toLowerCase();
                if (!ingredientMap.has(key)) {
                    const special = allSpecials.find(s => s.ingredient_name.toLowerCase() === key);
                    const priceInfo = special ? parsePrice(special.price) : { type: 'unparseable' };
                    ingredientMap.set(key, { name: ingredient.name, items: [], priceInfo });
                }
                const quantityMatch = ingredient.quantity.match(/^(\d*\.?\d+)\s*(.*)$/);
                const mapEntry = ingredientMap.get(key);
                if (quantityMatch) {
                    const value = parseFloat(quantityMatch[1]);
                    const unit = quantityMatch[2].trim().toLowerCase();
                    const existingItem = mapEntry.items.find(item => item.unit === unit);
                    if (existingItem) {
                        existingItem.total += value;
                    } else {
                        mapEntry.items.push({ total: value, unit: unit });
                    }
                } else {
                    const unit = ingredient.quantity.trim().toLowerCase();
                    if (unit) {
                        const existingItem = mapEntry.items.find(item => item.unit === unit);
                        if (existingItem) { existingItem.total += 1; } else { mapEntry.items.push({ total: 1, unit: unit }); }
                    }
                }
            });
        });
        return Array.from(ingredientMap.values());
    }, [selectedRecipes, allSpecials]);

    const { lineItems, totalCost } = useMemo(() => {
        let runningTotal = 0;
        const itemsWithPrices = consolidatedList.map(item => {
            let priceDisplay = 'N/A';
            
            if (item.priceInfo.type === 'unit') {
                const quantity = item.items.reduce((sum, subItem) => sum + subItem.total, 0);
                const itemTotal = quantity * item.priceInfo.cost;
                priceDisplay = `$${itemTotal.toFixed(2)}`;
                runningTotal += itemTotal;
            } else if (item.priceInfo.type === 'rate') {
                const quantityInGrams = item.items
                    .filter(subItem => subItem.unit === 'g' || subItem.unit === 'grams')
                    .reduce((sum, subItem) => sum + subItem.total, 0);
                
                if (quantityInGrams > 0 && item.priceInfo.unit === 'kg') {
                    const itemTotal = (quantityInGrams / 1000) * item.priceInfo.rate;
                    priceDisplay = `$${itemTotal.toFixed(2)}`;
                    runningTotal += itemTotal;
                } else {
                    priceDisplay = `@ $${item.priceInfo.rate.toFixed(2)}/${item.priceInfo.unit}`;
                }
            }
            return { ...item, priceDisplay };
        });

        return { lineItems: itemsWithPrices, totalCost: runningTotal };
    }, [consolidatedList]);

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
            {lineItems.length === 0 ? (
                <p>Select some recipes to get started!</p>
            ) : (
                <>
                    <ul>
                        {lineItems.map(item => {
                            const isChecked = checkedItems.includes(item.name.toLowerCase());
                            return (
                                <li key={item.name} className={isChecked ? 'checked' : ''}>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={isChecked} onChange={() => handleCheckItem(item.name)} />
                                        <strong>{item.name}</strong>
                                    </label>
                                    <div className="item-details">
                                        <span className="item-quantity">{item.items.map(subItem => `${subItem.total} ${subItem.unit}`).join(', ')}</span>
                                        <span className="item-price">{item.priceDisplay}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="total-cost-section">
                        <strong>Total Estimated Cost:</strong>
                        <span>${totalCost.toFixed(2)}</span>
                    </div>
                    <p className="disclaimer">*Total may not include all items.</p>
                </>
            )}
        </div>
    );
};

export default ShoppingList;