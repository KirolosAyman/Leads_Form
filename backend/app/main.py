from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, users, leads

# Create Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Leads Platform", version="1.0.0")

# CORS Middleware
origins = [
    "http://localhost:5173", # Vite Default
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(leads.router, prefix="/api", tags=["Leads"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Leads Platform API"}
