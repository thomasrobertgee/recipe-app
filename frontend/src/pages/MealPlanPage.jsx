// src/pages/MealPlanPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import RecipeTile from '../components/RecipeTile'; // We still need this for rendering planned items
import { toast } from 'react-toastify';
import {
    DndContext,
    closestCenter, // Using closestCenter, consider pointerWithin or rectIntersection if needed
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getSimplePrice, findBestSpecialMatch } from '../utils/priceUtils';
import './MealPlanPage.css';
import '../pages/Page.css'; // Re-use common page styles

// --- Define week days and meal types ---
const weekDays = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];
const mealTypes = ["Lunch", "Dinner"];

// --- Function to get date string for the week ---
const getDateForDay = (dayName) => {
    const today = new Date();
    // Adjust today's index: Sunday (0) becomes 6, Monday (1) becomes 0, etc.
    const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const targetDayIndex = weekDays.indexOf(dayName);
    if (targetDayIndex === -1) return { iso: null, display: '' };

    let dayDifference = targetDayIndex - currentDayIndex;
    // No need to wrap around for past days in the *current* week view usually
    // if (dayDifference < 0) dayDifference += 7; // Removed wrap-around logic

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayDifference);

    const isoDate = targetDate.toISOString().split('T')[0];
    // Format for display (e.g., Mon 27/10)
    const displayDate = targetDate.toLocaleDateString('en-AU', {
        // weekday: 'short', // Keep day name separate
        day: '2-digit',
        month: '2-digit'
    });

    return { iso: isoDate, display: displayDate };
};

// --- Draggable Recipe (No change needed) ---
function DraggableRecipeTile({ recipe }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `recipe-${recipe.id}`, data: { recipe } });
    const style = { transform: CSS.Transform.toString(transform), zIndex: 100, cursor: 'grab' };
    return <div ref={setNodeRef} style={style} {...listeners} {...attributes}><RecipeTile recipe={recipe} /></div>;
}

// --- NEW: Droppable Slot Component for Lunch/Dinner ---
function DroppableSlot({ day, mealType, date, children }) {
    const id = `slot-${date}-${mealType}`; // Unique ID including date and mealType
    const { isOver, setNodeRef } = useDroppable({
        id: id,
        data: { date, mealType } // Pass date and mealType
    });
    const style = {
        backgroundColor: isOver ? '#e8f5e9' : '#fdfdfd',
        border: isOver ? '2px dashed #4caf50' : '1px dashed #ddd',
        minHeight: '150px' // Adjust height as needed
    };
    return (
        <div ref={setNodeRef} className="calendar-slot" style={style}>
            <h4>{mealType}</h4>
            <div className="slot-recipe-list">
                {children.length > 0 ? children : <p>Drop here</p>}
            </div>
        </div>
    );
}
// --- END NEW ---


function MealPlanPage() {
    const { userProfile, savedRecipes, fetchSavedRecipes, handleSelectRecipe, selectedRecipes } = useAuth();
    const [mealPlan, setMealPlan] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allSpecials, setAllSpecials] = useState([]);

    useEffect(() => {
        axios.get('/api/prices/today')
            .then(response => setAllSpecials(response.data))
            .catch(error => console.error("Could not fetch specials for Meal Plan page", error));
    }, []);

    useEffect(() => {
        // Only fetch saved recipes if they aren't already loaded in context
        if (!savedRecipes || savedRecipes.length === 0) {
            fetchSavedRecipes();
        }
        fetchMealPlan();
    // Ensure fetchSavedRecipes is stable via useCallback in context if including here
    }, [fetchSavedRecipes, savedRecipes]);

    const fetchMealPlan = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/meal-plan');
            setMealPlan(res.data); setError(null);
        } catch (err) {
            console.error("Error fetching meal plan:", err);
            setError("Could not load meal plan."); toast.error("Could not load meal plan.");
        } finally { setIsLoading(false); }
    };

    // --- UPDATED: Group meal plan by Date and Meal Type ---
    const mealPlanByDateAndType = useMemo(() => {
        return mealPlan.reduce((acc, entry) => {
            const dateStr = entry.plan_date; // Use the ISO date string as the key
            if (!acc[dateStr]) acc[dateStr] = {};
            if (!acc[dateStr][entry.meal_type]) acc[dateStr][entry.meal_type] = [];
            acc[dateStr][entry.meal_type].push(entry);
            return acc;
        }, {});
    }, [mealPlan]);
    // --- END UPDATED ---

    const planDetails = useMemo(() => {
        // ... (calculation logic remains the same) ...
        if (!mealPlan || mealPlan.length === 0) {
            return { planIngredients: [], planCost: 0 };
        }
        const itemsMap = new Map();
        let calculatedCost = 0;
        mealPlan.forEach(({ recipe }) => {
            if (!recipe || !recipe.ingredients) return; // Add safety check
            recipe.ingredients.forEach(ingredient => {
                const special = findBestSpecialMatch(ingredient.name, allSpecials);
                const existingItem = itemsMap.get(ingredient.ingredient_id);
                if (existingItem) {
                    existingItem.count += 1;
                    existingItem.recipeTitles.add(recipe.title);
                } else {
                    itemsMap.set(ingredient.ingredient_id, {
                        id: ingredient.ingredient_id,
                        name: ingredient.name,
                        priceString: special ? special.price : null,
                        store: special ? special.store : null,
                        count: 1,
                        recipeTitles: new Set([recipe.title]),
                    });
                }
            });
        });
        const planIngredients = Array.from(itemsMap.values()).sort((a,b) => a.name.localeCompare(b.name));
        calculatedCost = planIngredients.reduce((total, item) => {
            if (item.priceString) {
                return total + (getSimplePrice(item.priceString) * item.count);
            }
            return total;
        }, 0);
        return { planIngredients, planCost: calculatedCost };
    }, [mealPlan, allSpecials]);

    // --- UPDATED: Handle drag end to get date and mealType from drop target ---
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        // Check if dropped onto a valid slot
        if (!over || !over.id.startsWith('slot-') || !active.id.startsWith('recipe-')) return;

        const droppedRecipe = active.data.current?.recipe;
        const targetDate = over.data.current?.date; // Get date from drop data
        const targetMealType = over.data.current?.mealType; // Get mealType from drop data

        if (!droppedRecipe || !targetDate || !targetMealType) {
            console.error("Drag end failed: Missing recipe, date, or meal type data.");
            return;
        }

        console.log(`Dropped ${droppedRecipe.title} onto ${targetDate} ${targetMealType}`); // Debug log

        try {
            const payload = {
                recipe_id: droppedRecipe.id,
                plan_date: targetDate,
                meal_type: targetMealType,
                // Add use_for_leftovers later
            };
            const res = await axios.post('/api/meal-plan', payload);
            setMealPlan(prevPlan => [...prevPlan, res.data]);
            toast.success(`${droppedRecipe.title} added to ${targetMealType} on ${targetDate}`);
        } catch (err) {
             console.error("Error adding meal plan entry:", err.response?.data || err);
             toast.error(err.response?.data?.detail || `Could not add ${droppedRecipe.title}.`);
        }
    };
    // --- END UPDATED ---

    const handleDeleteRecipe = async (entryId, recipeTitle) => {
        // ... (logic remains the same) ...
        if (!window.confirm(`Remove ${recipeTitle}?`)) return;
        try {
            await axios.delete(`/api/meal-plan/${entryId}`);
            setMealPlan(prevPlan => prevPlan.filter(entry => entry.id !== entryId));
            toast.info(`${recipeTitle} removed.`);
        } catch (err) { console.error("Error deleting:", err); toast.error("Could not remove."); }
    };

    const handleAddPlanToShoppingList = () => {
        // ... (logic remains the same) ...
        if (mealPlan.length === 0) { toast.info("Plan empty."); return; }
        const currentIds = new Set(selectedRecipes.map(item => item.recipe.id));
        let added = 0;
        mealPlan.forEach(entry => { if (!currentIds.has(entry.recipe.id)) { handleSelectRecipe(entry.recipe); added++; } });
        if (added > 0) toast.success(`Added ${added} new recipe(s) to shopping list!`);
        else toast.info("All plan recipes already in list.");
    };

    const isOverBudget = userProfile?.weekly_budget && planDetails.planCost > userProfile.weekly_budget;

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="app-container meal-plan-page"> {/* Added meal-plan-page class */}
                <header className="page-header">
                    <h1>My Meal Plan</h1>
                    <button onClick={handleAddPlanToShoppingList} className="add-plan-to-list-btn" disabled={mealPlan.length === 0}>
                        Add Plan to Shopping List
                    </button>
                    {/* Simplified instructions */}
                    <p>Drag recipes onto Lunch or Dinner slots below.</p>
                </header>

                {error && <p className="error-message">{error}</p>}

                <div className="meal-plan-layout">
                    {/* Column 1: Saved Recipes (No changes needed here) */}
                    <aside className="meal-plan-recipes-list">
                        <h2>My Saved Recipes</h2>
                        <div className="recipes-container">
                            {isLoading && <p>Loading...</p>}
                            {savedRecipes && savedRecipes.length > 0 ? (
                                savedRecipes.map(recipe => <DraggableRecipeTile key={recipe.id} recipe={recipe} />)
                            ) : (!isLoading && <p>No saved recipes. Add some!</p>)}
                        </div>
                    </aside>

                    {/* Column 2: Calendar - UPDATED STRUCTURE */}
                    <main className="meal-plan-calendar">
                        {/* Removed "This Week's Plan" H2 */}
                        <div className="calendar-days-container"> {/* New container */}
                            {weekDays.map(day => {
                                const { iso: dateStr, display: displayDate } = getDateForDay(day);
                                const dayEntries = mealPlanByDateAndType[dateStr] || {};
                                const lunchEntries = dayEntries["Lunch"] || [];
                                const dinnerEntries = dayEntries["Dinner"] || [];

                                return (
                                    <div key={day} className="calendar-day-group">
                                        <h3 className="day-group-header">{day} ({displayDate})</h3>
                                        <div className="day-slots">
                                            <DroppableSlot day={day} mealType="Lunch" date={dateStr}>
                                                {lunchEntries.map(entry => (
                                                    <div key={entry.id} className="planned-recipe-tile">
                                                        <RecipeTile recipe={entry.recipe} />
                                                        <button onClick={() => handleDeleteRecipe(entry.id, entry.recipe.title)} className="delete-plan-item-btn" title="Remove">&times;</button>
                                                        {/* Add Leftovers Toggle Here Later */}
                                                    </div>
                                                ))}
                                            </DroppableSlot>
                                            <DroppableSlot day={day} mealType="Dinner" date={dateStr}>
                                                {dinnerEntries.map(entry => (
                                                     <div key={entry.id} className="planned-recipe-tile">
                                                        <RecipeTile recipe={entry.recipe} />
                                                        <button onClick={() => handleDeleteRecipe(entry.id, entry.recipe.title)} className="delete-plan-item-btn" title="Remove">&times;</button>
                                                        {/* Add Leftovers Toggle Here Later */}
                                                    </div>
                                                ))}
                                            </DroppableSlot>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </main>
                    {/* END UPDATED STRUCTURE */}


                    {/* Column 3: Plan Info (No changes needed here) */}
                    <aside className="meal-plan-info-column">
                        <h2>Plan Info</h2>
                        {userProfile?.weekly_budget && (
                            <div className={`budget-tracker ${isOverBudget ? 'over-budget' : ''}`}>
                                <strong>Budget: ${userProfile.weekly_budget.toFixed(2)}</strong> /
                                <span> Est. Cost: ${planDetails.planCost.toFixed(2)}</span>
                                {isOverBudget && <span className="budget-warning"> (Over Budget!)</span>}
                            </div>
                        )}
                        {planDetails.planIngredients.length > 0 ? (
                            <>
                                <h4>Ingredients Needed:</h4>
                                <ul className="plan-ingredients-list">
                                    {planDetails.planIngredients.map(item => (
                                        <li key={item.id} className="plan-ingredient-item">
                                            <span className="plan-ingredient-name">{item.name} {item.count > 1 ? `(${item.count})` : ''}</span>
                                            <span className="plan-ingredient-price">
                                                {item.priceString ? `$${getSimplePrice(item.priceString).toFixed(2)}` : 'N/A'}
                                                {item.store && <span className="plan-ingredient-store"> @ {item.store}</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p>Add recipes to the plan to see ingredients here.</p>
                        )}
                    </aside>
                </div>
            </div>
        </DndContext>
    );
}

export default MealPlanPage;