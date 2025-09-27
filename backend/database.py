# backend/database.py

from sqlmodel import create_engine, SQLModel

# Define the database file. It will be created in the same backend folder.
sqlite_file_name = "db.sqlite3"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# The engine is the main object that connects our app to the database.
# echo=True will print the SQL commands it's running, which is useful for debugging.
engine = create_engine(sqlite_url, echo=True)

# This function will create the database tables based on our SQLModel blueprints.
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)