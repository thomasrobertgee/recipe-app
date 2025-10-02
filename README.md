# Recipe App MVP

This project is a full-stack Minimum Viable Product (MVP) of a recipe recommendation app. The goal is to help users save money by generating recipes based on supermarket specials, tailored to their personal preferences.

The application consists of a Python backend that serves data from a database and a React frontend that displays that data.

---

## Current Features

- **Full User Authentication:** Users can register, log in, and maintain a persistent session using JWTs.
- **User Preference Management:** A dedicated profile page where users can save their household size and select dietary requirements and allergies.
- **AI-powered recipe generation** that uses a user's saved preferences to create tailored recipes.
- **Interactive Shopping List:**
    - A dynamic list with intelligent ingredient consolidation.
    - A persistent checklist that remembers a user's selections.
    - **Price estimation** for individual items and a running total cost.
- Full CRUD functionality for recipes and specials.
- Clean, responsive card-based layout and interactive modal view for recipes.

---

## Future Development Roadmap

This section outlines the planned features to evolve the app from an MVP into a full-featured product.

### User Personalization
- **Budget Tracking:** Allow users to set a weekly or monthly budget.
- **Likes & Dislikes:** A system for users to specify ingredients to avoid.
- **OAuth:** Add "Sign in with Google" as an alternative login method.

### Core App Enhancements
- **Filtered Recipe View:** The main recipe page will filter recipes based on the user's saved preferences.
- **Recipe Management:** Allow users to save favorite recipes and rate them.
- **Multi-Supermarket Support:** Expand the web scraper to include Woolworths and Aldi.

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

    # Activate on Mac/Linux
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