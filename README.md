# Recipe App MVP

This project is a full-stack Minimum Viable Product (MVP) of a recipe recommendation app. The goal is to help users save money by generating recipes based on supermarket specials, tailored to their personal preferences.

The application consists of a Python backend that serves data from a database and a React frontend that displays that data.

---

## Current Features

- **Full User Authentication:** Users can register, log in, and maintain a persistent session using JWTs.
- **User Preference Management:** A dedicated profile page where users can save their household size and select dietary requirements and allergies.
- **AI-powered recipe generation** that uses a user's saved preferences to create tailored recipes.
- **Recipe Ratings & Filtering:** Users can rate recipes from 1-5 stars. All recipe pages can be filtered by minimum star rating and sorted by rating.
- A read-only page for viewing the current weekly specials.
- **Recipe & Shopping List Costing:** Displays an estimated cost for each recipe and a total for the shopping list, based on the full price of the required on-special items.
- **Interactive Shopping List:** A dynamic list of required special items with a persistent checklist.
- Full CRUD functionality for recipes (AI-Create, Read, Delete) and specials (backend-managed).
- A dedicated landing page for new and logged-out users.
- Polished UI with a modern recipe card design, interactive modals, and toast notifications.

---

## Future Development Roadmap

This section outlines the planned features to evolve the app from an MVP into a full-featured product.

### User Personalization
- **Budget Tracking:** Allow users to set a weekly or monthly budget.
- **OAuth:** Add "Sign in with Google" as an alternative login method.

### Core App Enhancements
- **Advanced Costing:** Implement per-portion recipe costing and waste calculation.
- **Multi-Supermarket Support:** Expand the specials database to include data from Woolworths and Aldi.

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