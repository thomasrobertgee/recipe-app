# Recipe App MVP

This project is a full-stack Minimum Viable Product (MVP) of a recipe recommendation app. The goal is to help users save money by generating recipes based on supermarket specials, tailored to their personal preferences.

The application consists of a Python backend that serves data from a database and a React frontend that displays that data.

---

## Current Features

- **Full User Authentication:** Users can register, log in, and maintain a persistent session using JWTs.
- **User Preference Management:** A dedicated profile page where users can save their household size, dietary requirements, and allergies.
- **AI-powered recipe generation** that uses a user's saved preferences to create tailored recipes.
- A read-only page for viewing the current weekly specials.
- **Interactive Shopping List:** A dynamic list with intelligent ingredient consolidation, a persistent checklist, and price estimation.
- Full CRUD functionality for recipes (AI-Create, Read, Delete) and specials (backend-managed).
- A dedicated landing page for new and logged-out users.
- Polished UI with a modern recipe card design, interactive modals, and toast notifications.

---

## Future Development Roadmap

This section outlines the planned features to evolve the app into a full-featured product.

### Core Recipe & Shopping Experience
- **Personalized Home Dashboard:** The main page for logged-in users will display a 3x3 grid of personalized recipes based on current specials, with a "View More" button to load more.
- **Recipe Costing Engine:**
    - Each recipe will have a calculated dollar value.
    - This cost will dynamically scale based on the user's saved household size.
- **Enhanced Recipe Cards:** Recipe cards will display the calculated cost and the user rating.
- **Special Ingredient Highlighting:** On the recipe detail view, ingredients that are not currently on special will be visually highlighted.
- **Interactive Shopping List 2.0:** The shopping list will be enhanced with price scaling based on household size.

### User Personalization & Interaction
- **Recipe Rating System:** Users will be able to rate recipes on a 1-5 star scale.
- **Recipe Filtering:** The main recipes page will have filter options, allowing users to show only recipes that match their saved dietary and allergy preferences (e.g., "Vegan", "Gluten-Free").
- **Recipe Tagging System:** The backend will automatically tag recipes with relevant dietary/allergy info upon generation.

### Data & Backend Enhancements
- **Multi-Supermarket Database:** Expand the specials database to include data from Woolworths and Aldi for comprehensive comparisons.
- **Persistent Recipes:** Generated recipes are saved permanently in the database.

---

## Tech Stack


### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Database ORM:** SQLModel
- **Database:** SQLite
- **AI:** OpenAI GPT API
- **Scraping:** Requests & BeautifulSoup4

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