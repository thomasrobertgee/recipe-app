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
- **Intelligent Shopping List:** A dynamic list that consolidates ingredients, calculates costs, and tracks spending against a user's budget.
- **Interactive Cook Mode:** A persistent, step-by-step cooking interface with integrated, clickable timers to guide users while cooking.
- **Supplier Portal:**
    - Separate registration for local suppliers (e.g., butchers, greengrocers).
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

### Core App Enhancements
1.  **Refine Receipt Scanning:** Improve AI prompt for accuracy, potentially add manual correction step, and integrate price extraction with budget tracking (once implemented).

### Community & Engagement Features
2.  **Community Recipes & Recipe Sharing:** Allow users to submit their own favorite recipes. Other users could then search, view, save, and rate these community-submitted meals. A "Share" button would also generate a unique, shareable link for any recipe.
3.  **"Cooking Streak" & Achievements:** Gamify the cooking experience by adding a "I Made This!" button to Cook Mode. This would contribute to a "Weekly Cooking Streak" and unlock badges for achievements like staying under budget or using up pantry items.

### Advanced Data & AI Features
*(Supplier integration moved to Current Features)*

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