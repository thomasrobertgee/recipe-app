# Recipe App MVP

This project is a full-stack Minimum Viable Product (MVP) of a recipe recommendation app. The goal is to help users save money by generating recipes based on supermarket specials, tailored to their personal preferences.

The application consists of a Python backend that serves data from a database and a React frontend that displays that data.

---

## Current Features

- **Full User Authentication:** Users can register, log in, and maintain a persistent session using JWTs.
- **Google OAuth 2.0 Login:** Users can sign up or log in using their Google accounts.
- **Robust Web Scraper:**
    - Utilizes **ScrapingBee** to bypass bot detection and render JavaScript-heavy pages.
    - Scrapes specific, high-value categories (e.g., "Meat & Seafood", "Fruit & Vegetables").
    - **Dynamically handles pagination**, scraping all available pages for each category automatically.
    - Extracts detailed price information, including unit prices (e.g., per kg).
- **AI-powered recipe generation** that uses a user's saved preferences and pantry items to create tailored recipes.
- **AI-powered Recipe Modification:** Users can request modifications to any recipe (e.g., "make this vegan", "double the servings"), and the AI will generate a new, updated version.
- **My Pantry Feature:** Users can add from a categorized list of staple ingredients to their personal pantry.
- **Recipe Ratings & Filtering:** Users can rate recipes and filter/sort them.
- **Intelligent Shopping List:** A dynamic list that consolidates ingredients, calculates costs, and tracks spending against a user's budget.
- **Interactive Cook Mode:** A persistent, step-by-step cooking interface with integrated, clickable timers to guide users while cooking.
- Full CRUD functionality for recipes and specials.

---

## Future Development

Here are some of the planned features to evolve the app from an MVP into a full-featured product.

### Core App Enhancements
1.  **Meal Planner & Weekly Budgeting:** A new "Meal Plan" page with a weekly calendar. Users can drag and drop recipes onto days of the week, generating a consolidated shopping list for the entire plan and tracking the total cost against their weekly budget.

2.  **Barcode Scanning for Pantry Management:** A "Scan Barcode" button on the "My Pantry" page that uses the device's camera. Scanning a product's barcode would use an open API (like Open Food Facts) to automatically identify and add the item to the user's pantry.

### Community & Engagement Features
3.  **Community Recipes & Recipe Sharing:** Allow users to submit their own favorite recipes. Other users could then search, view, save, and rate these community-submitted meals. A "Share" button would also generate a unique, shareable link for any recipe.

4.  **"Cooking Streak" & Achievements:** Gamify the cooking experience by adding a "I Made This!" button to Cook Mode. This would contribute to a "Weekly Cooking Streak" and unlock badges for achievements like staying under budget or using up pantry items.

### Advanced Data & AI Features
5.  **Integration with Local Suppliers:** Create a portal for local butchers and greengrocers to upload their weekly specials. These would then appear in the app, promoting local businesses and providing users with unique deals.

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

### Frontend
- **Language:** JavaScript
- **Framework:** React
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **Routing:** React Router
- **Authentication:** **@react-oauth/google**

---

## Getting Started
To get the application running locally, you will need to set up and run both the backend and the frontend.

### Prerequisites
- Python 3.9+
- Node.js and npm
- Git

### Environment Variables
This project requires several API keys to function.

1.  **Backend (`backend/.env`):**
    ```
    SECRET_KEY="YOUR_JWT_SECRET_KEY"
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    SCRAPINGBEE_API_KEY="YOUR_SCRAPINGBEE_API_KEY"
    GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLOUD_CLIENT_ID"
    ```

2.  **Frontend (`frontend/.env`):**
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