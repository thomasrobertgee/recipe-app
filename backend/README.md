# Recipe App MVP

This project is the backend for a Minimum Viable Product (MVP) of a recipe recommendation app. The goal of the app is to help users save money by generating recipes based on supermarket specials.

This backend is responsible for storing recipe and ingredient data and serving it via a REST API.

---

## Tech Stack

- **Backend:** Python
- **Framework:** FastAPI
- **Database ORM:** SQLModel (combining SQLAlchemy and Pydantic)
- **Database:** SQLite

---

## Getting Started

To get the backend server running locally, follow these steps.

### Prerequisites

- Python 3.9+
- Git

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/thomasrobertgee/recipe-app.git](https://github.com/thomasrobertgee/recipe-app.git)
    cd recipe-app/backend
    ```

2.  **Create and activate a virtual environment:**
    ```sh
    # Create the environment
    python -m venv venv

    # Activate on Windows (Git Bash)
    source venv/Scripts/activate

    # Activate on Mac/Linux
    # source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Seed the database:**
    The first time you set up the project, you need to populate the database with initial data.
    ```sh
    python seed.py
    ```

5.  **Run the server:**
    ```sh
    uvicorn main:app --reload
    ```
    The server will be available at `http://127.0.0.1:8000`.

---

## API Endpoints

- **`GET /api/recipes`**: Retrieves a list of all recipes in the database.
- **`GET /docs`**: View the interactive API documentation (Swagger UI).