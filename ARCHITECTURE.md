# Architecture & Implementation Plan

## 1. Project Structure
The application will follow a clean separation of concerns with a backend API and a managed frontend.

```
/
├── backend/                # FastAPI Application
│   ├── app/
│   │   ├── main.py         # Entry point and app initialization
│   │   ├── models.py       # SQLAlchemy Database Models
│   │   ├── schemas.py      # Pydantic Schemas for validation
│   │   ├── crud.py         # Database operations (CRUD)
│   │   ├── auth.py         # Authentication & Token logic
│   │   ├── dependencies.py # Dependency injection (Current User, DB session)
│   │   └── routers/        # API Routes
│   │       ├── auth.py     # Login/Token endpoints
│   │       ├── users.py    # User management endpoints
│   │       └── leads.py    # CSV Upload and Search endpoints
│   └── requirements.txt
│
├── frontend/               # Vite + React Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page views (Login, Admin Dashboard, Agent Search)
│   │   ├── context/        # Auth Context
│   │   ├── styles/         # Global styles (CSS)
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## 2. Technology Stack
- **Backend**: Python 3.10+, FastAPI
- **Database**: SQLite (Development), SQLAlchemy ORM (Sync/Async)
- **Authentication**: OAuth2 with Password Flow (JWT Tokens), Passlib (Bcrypt hashing)
- **Frontend**: React (via Vite)
- **Styling**: Vanilla CSS (Modern, Responsive, Glassmorphism, HSL Variables)

## 3. Database Schema

### Users Table
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | Primary Key |
| email | String | Unique, Indexed |
| hashed_password | String | |
| first_name | String | |
| last_name | String | |
| role | Enum | 'admin', 'agent' |
| is_active | Boolean | Default True |

### Leads (CSV Records) Table
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | Primary Key |
| phone_number | String | Indexed for search |
| first_name | String | |
| last_name | String | |
| email | String | Optional |
| address | String | |
| ... | ... | Extendable fields |
| created_at | DateTime | |
| updated_at | DateTime | |

## 4. Security & Validation
- **Passwords**: Never stored in plain text. Hashed using Bcrypt.
- **CSV Validation**:
  - Check for required headers: `phone_number`, `first_name`, `last_name`, etc.
  - specific data type consistency validation.
- **Access Control**:
  - `Admin`: Can create users, upload CSVs.
  - `Agent`: Can search leads, edit simplified fields.

## 5. Next Steps
1. Initialize Backend Environment & Install Dependencies.
2. Initialize Frontend (Vite).
3. Implement Database Models.
4. Implement Authentication.
5. Implement CSV Upload.
6. Implement Agent Search & Edit.
