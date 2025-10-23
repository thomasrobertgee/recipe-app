# Recipe App MVP

This project is a full-stack Minimum Viable Product (MVP) of a recipe recommendation app. The goal is to help users save money by generating recipes based on supermarket specials, tailored to their personal preferences.

The application consists of a Python backend that serves data from a database and a React frontend that displays that data.

---

## Current Features

- **Full User Authentication:** Users can register, log in, and maintain a persistent session using JWTs.
- **Google OAuth 2.0 Login:** Users can sign up or log in using their Google accounts.
- **New User Onboarding:** A multi-step modal guides new users through setting up their profile preferences (household size, budget, dietary needs, cuisines, skill level).
- **Robust Web Scraper:**
    - Utilizes **ScrapingBee** to bypass bot detection and render JavaScript-heavy pages.
    - Scrapes specific, high-value categories (e.g., "Meat & Seafood", "Fruit & Vegetables").
    - **Dynamically handles pagination**, scraping all available pages for each category automatically.
    - Extracts detailed price information, including unit prices (e.g., per kg).
- **AI-powered recipe generation** that uses a user's saved preferences and pantry items to create tailored recipes (Note: Recipes are now generated globally and not auto-saved to user profiles).
- **AI-powered Recipe Modification:** Users can request modifications to any recipe (e.g., "make this vegan", "double the servings"), and the AI will generate a new, updated version.
- **My Pantry Feature:** Users can add from a categorized list of staple ingredients to their personal pantry.
- **Barcode Scanning:** Users can scan product barcodes using their device camera to quickly add items to their pantry (utilizes Open Food Facts API via backend proxy).
- **Receipt Scanning (Beta):** Users can upload or take a photo of a receipt. Google Cloud Vision OCR extracts text, and OpenAI API parses items to add them to the pantry.
- **Recipe Ratings & Filtering:** Users can rate recipes and filter/sort them.
- **Intelligent Shopping List:** A dynamic list that consolidles ingredients, calculates costs, and tracks spending against a user's budget.
- **Interactive Cook Mode:** A persistent, step-by-step cooking interface with integrated, clickable timers to guide users while cooking.
- **Supplier Portal:**
    - Separate registration for local suppliers (e.g., butchers, greengrocerrs).
    - Dedicated portal for suppliers to log in and manage their own weekly specials (add/delete items and prices).
    - Supplier specials appear alongside supermarket specials for all users.
- **Meal Planner & Weekly Budgeting:**
    - Dedicated "Meal Plan" page with a 7-day calendar view.
    - Users can drag and drop saved recipes onto specific days.
    - Displays consolidated ingredients and estimated cost for the current plan, tracked against the user's weekly budget.
    - Button to add all planned recipes to the main shopping list.
- Full CRUD functionality for recipes and specials.
- **Recent Bug Fixes:** Addressed issues related to receipt scanning database transactions, AI prompt formatting for instructions and receipt items, JSON serialization errors, recipe rating display updates, login redirection for suppliers, and various frontend styling inconsistencies.

---

## Future Development

Here are some of the planned features to evolve the app from an MVP into a full-featured product.

### New Core Features
1.  **"Smart Pantry" Shopping List Sync:** Automatically cross-reference a recipe's ingredients with the user's "My Pantry" list. Any items the user already has will be moved to an "Already in your pantry" section of the shopping list, preventing duplicate purchases.
2.  **Price-Drop Alerts ("Stock Up" Notifier):** Create a "Watchlist" for staple items. If the scraper finds a price that is significantly lower than the item's historical average, send the user an in-app notification.

### Existing Feature Improvements
3.  **Refine Receipt Scanning (Manual Correction UI):** To improve accuracy, show a modal after the OCR/AI parsing that lists the detected items (e.g., "Bnnas"). This allows the user to correct any typos or misinterpretations before the items are added to their pantry.
4.  **Smarter Shopping List (Sort by Aisle):** Automatically group items on the "Intelligent Shopping List" based on their ingredient category (e.g., "Fruit & Vegetables," "Meat & Seafood") to optimize the in-store shopping experience.
5.  **Meal Planner "Leftovers" Integration:** Add a "Use for leftovers?" toggle when adding a recipe to the meal plan. This would add a "Leftovers" block to the next day's lunch and prevent those ingredients from being double-counted in the weekly shopping list.
6.  **Dynamic Cook Mode Scaling:** Add a dropdown (e.g., "0.5x", "1x", "2x") to the "Cook Mode" interface that dynamically updates all ingredient quantities within the step-by-step instructions.

### New AI & Data Features
7.  **AI Ingredient Identification (from Photo):** Use Google Cloud Vision's *object detection* to allow users to take a photo of their fridge or pantry. The API will identify items (e.g., "Carrot," "Lemon"), which the user can then add to their pantry with one click.
8.  **AI-Powered "Flavor Profile" Onboarding:** As an optional step during onboarding, present an AI-powered "flavor quiz" (e.g., "Spicy or mild?", "Rich or light?"). The AI will infer preferences to provide more personalized recipe recommendations.
9.  **Dynamic AI Generation Inputs:** Add "Max Cook Time" and "Difficulty" sliders to the recipe generation page. These values will be fed directly into the AI prompt to ensure recipes match the user's immediate needs.

### Community & Engagement
10. **Community "Cook-along" Challenges:** Building on the original "Community Recipes" idea, feature a "Weekly Challenge" based on a major supermarket special (e.g., "This week's star: $5/kg Chicken Thighs"). Users can cook a recipe using that item and post a photo and rating to build engagement.
11. **Community Recipes & Recipe Sharing:** Allow users to submit, share, and rate their own recipes.

---

## UI Improvement Suggestions

A collection of ideas for improving the application's User Interface, primarily focused on the public-facing landing page.

### Landing Page (First Impression)

1.  **Hero Section Improvements:**
    * **Stronger Headline:** Replace the generic "Welcome" with a benefit-driven headline like "Cook Smarter with AI-Powered Specials" or "Stop Overspending on Groceries."
    * **Clearer Call to Action (CTA):** Change the "Get Started" button text to a more direct and low-friction CTA like "Sign Up for Free."
    * **Better Visuals:** Replace the placeholder hero image with a high-quality, relevant photo. An idea is a split-screen image showing a supermarket receipt on one side and a delicious finished meal on the other, visually connecting the app's core concepts.

2.  **Features Section Improvements:**
    * **"Show, Don't Tell":** Replace the generic icons in the features section with small, clean screenshots of the *actual* application. For example:
        * "Save Money" -> Show a crop of the `SpecialsPage`.
        * "AI Powered" -> Show an `RecipeCard` with its AI tags.
        * "Reduce Waste" -> Show a snippet of the `My Pantry` page.
    * This builds user trust by proving the features are real and tangible.

3.  **Supplier Section & Navbar Flow:**
    * **Visual Separation:** Give the "For Suppliers" section on the landing page a distinct background color (e.g., light grey) to visually separate it from the main consumer-focused features.
    * **De-clutter Navbar:** Move the "For Suppliers" link out of the main homepage/navbar flow and place it in a new website footer. This keeps the homepage 99% focused on the primary user (the home cook), as suppliers will know to look in the footer for business-related links.

---

## Tech Stack

### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Database ORM:** SQLModel
- **Database:** SQLite
- **AI:** OpenAI GPT API
- **Authentication:** Passlib (hashing), python-jose (JWTs), **google-auth** (OAuth)
- **Scraping:** **ScrapingBee API, Requests & BeautifulSoup4**
- **APIs:** Requests (for Open Food Facts proxy), **google-cloud-vision** (OCR)

### Frontend
- **Language:** JavaScript
- **Framework:** React
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **Routing:** React Router
- **Authentication:** **@react-oauth/google**
- **Barcode Scanning:** **react-zxing**
- **Drag & Drop:** **@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities**

---

## Getting Started
To get the application running locally, you will need to set up and run both the backend and the frontend.

### Prerequisites
- Python 3.9+
- Node.js and npm
- Git
- Google Cloud Project with Cloud Vision API enabled and Service Account Key

### Environment Variables
This project requires several API keys/credentials to function.

1.  **Backend (`backend/.env`):**
    ```
    SECRET_KEY="YOUR_JWT_SECRET_KEY"
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    SCRAPINGBEE_API_KEY="YOUR_SCRAPINGBEE_API_KEY"
    GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLOUD_CLIENT_ID"
    ```
2.  **Backend (Environment Variable):** Set this in your terminal *before* running `uvicorn`:
    ```bash
    # Windows Command Prompt:
    # set GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\gcloud_keyfile.json"
    # Git Bash / Linux / macOS:
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/gcloud_keyfile.json"
    ```
3.  **Frontend (`frontend/.env`):**
    ```
    VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLOUD_CLIENT_ID"
    ```

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

    # Activate on macOS/Linux
    # source venv/bin/activate
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

## Testing on Mobile

You can test the locally running application on your mobile phone if it's connected to the same Wi-Fi network as your development PC.

1.  **Find your PC's Local IP Address:**
    * **Windows:** Open Command Prompt (`cmd`) and run `ipconfig`. Look for the IPv4 address under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.100`).
    * **Mac:** System Preferences > Network > Wi-Fi.
    * **Linux:** Run `ip addr show` in a terminal.

2.  **Configure Servers to Allow Network Access:**
    * **Backend (Uvicorn):** Start the server with the `--host 0.0.0.0` flag:
        ```sh
        uvicorn main:app --reload --host 0.0.0.0
        ```
    * **Frontend (Vite):** Modify the `dev` script in `frontend/package.json` to include the `--host` flag:
        ```json
        "scripts": {
          "dev": "vite --host",
          // ... other scripts
        },
        ```
        Then restart the frontend server (`npm run dev`).
    * **Backend CORS:** Add your PC's network origin to the `origins` list in `backend/main.py`:
        ```python
        origins = [
            "http://localhost:5173",
            "http://<YOUR_PC_IP_ADDRESS>:5173" # e.g., "[http://192.168.1.100:5173](http://192.168.1.100:5173)"
        ]
        ```
        Restart the backend server after this change.

3.  **Update Frontend API Base URL (Temporarily):**
    * In `frontend/src/context/AuthContext.jsx`, change `axios.defaults.baseURL` to use your PC's IP address and the **backend port (8000)**:
        ```jsx
        axios.defaults.baseURL = 'http://<YOUR_PC_IP_ADDRESS>:8000'; // e.g., '[http://192.168.1.100:8000](http://192.168.1.100:8000)'
        ```
    * Restart the frontend server.

4.  **Access on Mobile:**
    * Open a browser on your phone and navigate to `http://<YOUR_PC_IP_ADDRESS>:5173`.

**Notes:**
* Ensure both devices are on the exact same Wi-Fi network.
* Your PC's firewall might block connections; you may need to allow incoming connections on ports 5173 and 8000.
* **Remember to revert** the `--host` flags, CORS origin, and `axios.defaults.baseURL` when you return to PC-only development.
* Google OAuth login from mobile via local IP requires more complex workarounds (like ngrok) due to Google's security policies and is not covered here. Seeded logins will work.
* **Camera access (for barcode/receipt scanning) requires HTTPS.** This means testing camera features on mobile *requires* using a service like `ngrok` or deploying the app to an HTTPS environment. It won't work via `http://<IP_ADDRESS>`.

---

## API Endpoints
- **`GET /api/meal-plan`**: Get all meal plan entries for the current user.
- **`POST /api/meal-plan`**: Add a recipe to the meal plan for a specific date.
- **`DELETE /api/meal-plan/{entry_id}`**: Remove an entry from the meal plan.
- **`GET /api/recipes`**: Retrieves a list of all recipes (filter/sort options available).
- **`POST /api/recipes`**: Create a new recipe (admin/future feature).
- **`POST /api/recipes/{recipe_id}/rate`**: Rate a specific recipe. Returns updated recipe data.
- **`POST /api/recipes/modify`**: Get an AI-modified version of a recipe (doesn't save automatically).
- **`DELETE /api/recipes/{recipe_id}`**: Delete a specific recipe.
- **`GET /docs`**: View the interactive API documentation (Swagger UI).
- **`GET /api/barcode-lookup/{barcode}`**: Proxies a lookup to the Open Food Facts API.
- **`POST /api/pantry/scan-receipt`**: Receives receipt image, performs OCR/AI processing, adds items to pantry.
- **`GET /api/pantry`**: Get current user's pantry items.
- **`POST /api/pantry`**: Add an item to the user's pantry by name.
- **`DELETE /api/pantry/{ingredient_id}`**: Remove an item from the user's pantry.
- **`GET /api/prices/today`**: Get all specials recorded today (supermarket + supplier).
- **`GET /api/tags`**: Get a list of all unique recipe tags used.
- **`POST /register/supplier`**: Register a new supplier user and profile.
- **`GET /api/supplier/specials`**: (Supplier only) Get specials added by the logged-in supplier today.
- **`POST /api/supplier/specials`**: (Supplier only) Add/update a special for the logged-in supplier.
- **`DELETE /api/supplier/specials/{price_id}`**: (Supplier only) Delete a specific special added by the logged-in supplier.