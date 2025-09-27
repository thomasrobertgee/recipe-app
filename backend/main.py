# 1. Import FastAPI
from fastapi import FastAPI

# 2. Create an instance of the FastAPI class
app = FastAPI()

# 3. Define a "path operation decorator"
# This tells FastAPI that the function below is in charge of
# handling requests that go to the main URL "/"
@app.get("/")
def read_root():
    # 4. The function returns a simple JSON response
    return {"message": "Recipe App Backend is running!"}