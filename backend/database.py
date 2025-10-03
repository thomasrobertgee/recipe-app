# backend/database.py

from sqlmodel import create_engine, SQLModel, Session

sqlite_file_name = "db.sqlite3"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# --- NEW: get_session function now lives here ---
def get_session():
    with Session(engine) as session:
        yield session