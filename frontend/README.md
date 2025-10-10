# Recipe App MVP

This project is a full-stack Minimum Viable Product (MVP) of a recipe recommendation app. The goal is to help users save money by generating recipes based on supermarket specials, tailored to their personal preferences.

The application consists of a Python backend that serves data from a database and a React frontend that displays that data.

---

## Current Features

- **Full User Authentication:** Users can register, log in, and maintain a persistent session using JWTs.
- **Robust Web Scraper:**
    - Utilizes **ScrapingBee** to bypass bot detection and render JavaScript-heavy pages.
    - Scrapes specific, high-value categories (e.g., "Meat & Seafood", "Fruit & Vegetables").
    - **Dynamically handles pagination**, scraping all available pages for each category automatically.
    - Extracts detailed price information, including unit prices (e.g., per kg).
- **AI-powered recipe generation** that uses a user's saved preferences and pantry items to create tailored recipes.
- **My Pantry Feature:** Users can add from a categorized list of staple ingredients to their personal pantry.
- **Recipe Ratings & Filtering:** Users can rate recipes and filter/sort them.
- **Intelligent Shopping List:** A dynamic list that consolidates ingredients, calculates costs, and tracks spending against a user's budget.
- **Interactive Cook Mode:** A persistent, step-by-step cooking interface with integrated, clickable timers to guide users while cooking.
- Full CRUD functionality for recipes and specials.

---

## Future Development

Here are some of the planned features to evolve the app from an MVP into a full-featured product.

### 1. "Use It Up" - Pantry-First Recipe Generation
* **What it is:** A new mode where a user can select 2-3 ingredients from their pantry that are about to expire. The AI's primary goal would be to generate a recipe that uses up those specific ingredients, reducing food waste.
* **Why it's valuable:** It directly addresses the "what can I make with what I have?" problem, making the app useful even when a user doesn't plan to shop.
* **How to implement:**
    * **Frontend:** Add a "Use It Up" feature to the `PantryPage.jsx` that allows item selection.
    * **Backend:** Create a new endpoint (e.g., `/api/generate-from-pantry`) and a new function in `ai_service.py` with a modified prompt emphasizing the use of specific ingredients.

### 2. Meal Planner & Weekly Budgeting
* **What it is:** A new "Meal Plan" page with a weekly calendar. Users can drag and drop recipes onto days of the week, generating a consolidated shopping list for the entire plan and tracking the total cost against their weekly budget.
* **Why it's valuable:** This elevates the app from a simple recipe finder to a comprehensive meal planning and budgeting tool, helping users organize their entire week.
* **How to implement:**
    * **Frontend:** Create a `MealPlanPage.jsx` using a library like `react-beautiful-dnd` for the drag-and-drop interface.
    * **Backend:** The existing `User` model's `weekly_budget` can be used for tracking. The core logic from `ShoppingList.jsx` can be expanded to handle a week's worth of recipes.

### 3. Barcode Scanning for Pantry Management
* **What it is:** A "Scan Barcode" button on the "My Pantry" page that uses the device's camera. Scanning a product's barcode would use an open API (like Open Food Facts) to automatically identify and add the item to the user's pantry.
* **Why it's valuable:** This makes managing the pantry faster, more accurate, and more engaging than manual data entry.
* **How to implement:**
    * **Frontend:** Use a library like `react-qr-scanner` or `html5-qrcode` to implement the scanning functionality.
    * **API:** Make a `GET` request to an open food database API to fetch product information from the scanned barcode.

### 4. Advanced Recipe Filtering & Sorting
* **What it is:** Enhance the existing filter controls to allow users to filter recipes by the AI-generated tags (e.g., "Quick & Easy," "Vegan," "Spicy") and add new sorting options like "Cost: Low to High."
* **Why it's valuable:** As the number of recipes grows, advanced filtering and sorting become essential for users to easily find the meals that best fit their needs.
* **How to implement:**
    * **Backend:** The `/api/recipes` endpoint already supports tag filtering. Logic would need to be added to handle sorting by calculated cost.
    * **Frontend:** The `FilterSortControls.jsx` component would be updated to display the tag options (fetched from `/api/tags`) and the new sorting dropdown options.

---

## Tech Stack

### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Database ORM:** SQLModel
- **Database:** SQLite
- **AI:** OpenAI GPT API
- **Scraping:** **ScrapingBee API, Requests & BeautifulSoup4**

### Frontend
- **Language:** JavaScript
- **Framework:** React
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **Routing:** React Router

---

## Getting Started
To get the application running locally, you will need to set up and run both the backend and the frontend.

### Prerequisites
- Python 3.9+
- Node.js and npm
- Git

### Backend Setup
1.  Navigate to the backend directory:
    ```sh
    cd recipe-app/backend
    ```

2.  Create and activate a virtual environment:
    ```sh
    # Create the environment
    python -m venv venv

    # Activate on Windows (Git Bash)
    source venv/Scripts/activate
    ```

3.  Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```

### Frontend Setup
1.  In a separate terminal, navigate to the frontend directory:
    ```sh
    cd recipe-app/frontend
    ```

2.  Install dependencies:
    ```sh
    npm install
    ```

### Seeding the Database (Optional)
To populate your database with a large set of sample data, you can run the seeder script.
**Note:** This will delete all existing users, recipes, and specials.

1.  Make sure your backend server is running.
2.  In a second backend terminal (with the venv active), run:
    ```sh
    python seed.py
    ```
This will create 26 test users (`a@a.com` to `z@z.com`, password: `1234567890`) and 150 specials from Coles, Woolworths, and Aldi.

---

## Running the Full Application
For the app to work, both servers must be running simultaneously.

1.  **Start the Backend Server:**
    In your backend terminal (`recipe-app/backend`), run:
    ```sh
    uvicorn main:app --reload
    ```
    The backend will be available at `http://127.0.0.1:8000`.

2.  **Start the Frontend Server:**
    In your frontend terminal (`recipe-app/frontend`), run:
    ```sh
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

---

## API Endpoints
- **`GET /api/recipes`**: Retrieves a list of all recipes in the database.
- **`GET /docs`**: View the interactive API documentation (Swagger UI).