# Finance Dashboard Backend System

## Project Overview
A finance dashboard system that helps teams track income and expenses with a clear role-based experience. It provides backend APIs, data persistence, and a clean UI for Admin, Analyst, and Viewer roles. The system focuses on financial record management, filtering, and aggregated dashboard insights.

Key features:
- Role-based access (Admin, Analyst, Viewer)
- Financial records CRUD
- Filtering by type, category, and date range
- Summary aggregations for dashboards
- Mock authentication (no JWT)

## Tech Stack
- Next.js (App Router)
- PostgreSQL (Neon)
- Drizzle ORM
- TypeScript

## Features
- Mock user authentication
- Role-based access control
- Financial records CRUD (Admin only for writes)
- Filtering support (type, category, date range)
- Dashboard summary (totals, breakdowns, recent activity)
- Role-specific UI (Admin, Analyst, Viewer)

## Authentication and Authorization
This project uses mock authentication for simplicity. Users log in with email and password, and a cookie is set with basic user info. There is no JWT or session store.

Role handling is backend-controlled to prevent privilege escalation:
- New signups always get `VIEWER`
- `ADMIN` and `ANALYST` users are created only by seed scripts or database setup

## API Documentation

### Auth APIs

#### POST /api/auth/signup
Purpose: Create a new user with default role `VIEWER`.

Access: Public

Request body:
```json
{
	"name": "Jane Doe",
	"email": "jane@example.com",
	"password": "strongpassword"
}
```

Example request:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
	-H "Content-Type: application/json" \
	-d '{"name":"Jane Doe","email":"jane@example.com","password":"strongpassword"}'
```

Example response:
```json
{
	"user": {
		"id": "uuid",
		"name": "Jane Doe",
		"email": "jane@example.com",
		"role": "VIEWER",
		"isActive": true,
		"createdAt": "2026-04-03T10:00:00.000Z"
	}
}
```

Role access rules:
- Always assigns `VIEWER`
- Role cannot be set from request body

#### POST /api/auth/login
Purpose: Authenticate a user and set the auth cookie.

Access: Public

Request body:
```json
{
	"email": "admin@test.com",
	"password": "123456"
}
```

Example request:
```bash
curl -X POST http://localhost:3000/api/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"admin@test.com","password":"123456"}'
```

Example response:
```json
{
	"user": {
		"id": "uuid",
		"name": "Admin",
		"email": "admin@test.com",
		"role": "ADMIN"
	}
}
```

### Records APIs

#### POST /api/records
Purpose: Create a new financial record.

Access: Admin only

Request body:
```json
{
	"amount": 1200.5,
	"type": "income",
	"category": "Salary",
	"date": "2026-04-01",
	"note": "April payroll"
}
```

Example request:
```bash
curl -X POST http://localhost:3000/api/records \
	-H "Content-Type: application/json" \
	-d '{"amount":1200.5,"type":"income","category":"Salary","date":"2026-04-01","note":"April payroll"}'
```

Example response:
```json
{
	"record": {
		"id": "uuid",
		"amount": "1200.50",
		"type": "income",
		"category": "Salary",
		"date": "2026-04-01T00:00:00.000Z",
		"note": "April payroll",
		"userId": "uuid",
		"createdAt": "2026-04-03T10:00:00.000Z"
	}
}
```

#### GET /api/records
Purpose: Fetch records with optional filters.

Access: Admin, Analyst, Viewer

Query params:
- `type`: `income` or `expense`
- `category`: exact category match
- `startDate`: ISO date (inclusive)
- `endDate`: ISO date (inclusive)

Example request:
```bash
curl "http://localhost:3000/api/records?type=expense&category=Food&startDate=2026-04-01&endDate=2026-04-30"
```

Example response:
```json
{
	"records": [
		{
			"id": "uuid",
			"amount": "45.00",
			"type": "expense",
			"category": "Food",
			"date": "2026-04-02T00:00:00.000Z",
			"note": "Lunch",
			"userId": "uuid",
			"createdAt": "2026-04-03T10:00:00.000Z"
		}
	]
}
```

#### PUT /api/records/:id
Purpose: Update an existing record.

Access: Admin only

Request body (partial allowed):
```json
{
	"amount": 60,
	"category": "Food",
	"note": "Lunch and coffee"
}
```

Example response:
```json
{
	"record": {
		"id": "uuid",
		"amount": "60.00",
		"type": "expense",
		"category": "Food",
		"date": "2026-04-02T00:00:00.000Z",
		"note": "Lunch and coffee",
		"userId": "uuid",
		"createdAt": "2026-04-03T10:00:00.000Z"
	}
}
```

#### DELETE /api/records/:id
Purpose: Delete a record.

Access: Admin only

Example response:
```json
{
	"ok": true
}
```

### Dashboard API

#### GET /api/dashboard/summary
Purpose: Return aggregated data for dashboards.

Access: Admin, Analyst, Viewer

Example response:
```json
{
	"totalIncome": 5000,
	"totalExpense": 2400,
	"netBalance": 2600,
	"categoryBreakdown": [
		{ "category": "Salary", "total": 5000 },
		{ "category": "Food", "total": 300 }
	],
	"recentTransactions": [
		{
			"id": "uuid",
			"amount": "45.00",
			"type": "expense",
			"category": "Food",
			"date": "2026-04-02T00:00:00.000Z",
			"note": "Lunch",
			"userId": "uuid",
			"createdAt": "2026-04-03T10:00:00.000Z"
		}
	]
}
```

## Filtering Explanation
Filters are passed as query params on `GET /api/records`.

Examples:
- `type=income` to show income only
- `category=Utilities` to match a category exactly
- `startDate=2026-04-01&endDate=2026-04-30` to filter by date range

## Dashboard Logic
The summary endpoint calculates:
- Total income
- Total expense
- Net balance (`totalIncome - totalExpense`)
- Category breakdown (sum by category)
- Recent transactions (latest 5 by date)

## Role-Based Access

| Role   | Can View Dashboards | Can View Records | Can Create/Update/Delete |
|--------|---------------------|------------------|--------------------------|
| Admin  | Yes                 | Yes              | Yes                      |
| Analyst| Yes                 | Yes              | No                       |
| Viewer | Yes                 | Yes              | No                       |

## Test Credentials
- admin@test.com / 123456
- analyst@test.com / 123456
- viewer@test.com / 123456

## Project Structure
```
src/
	app/
		admin/
		analyst/
		viewer/
		api/
			auth/
			records/
			dashboard/
	db/
		schema.ts
		seed.ts
	lib/
		auth.ts
```

## Setup Instructions
1. Install dependencies
	 ```bash
	 npm install
	 ```
2. Add environment variables
	 ```bash
	 DATABASE_URL=your_neon_postgres_url
	 ```
3. Run the project
	 ```bash
	 npm run dev
	 ```

## Design Decisions
- Mock authentication keeps setup simple for demos and interviews.
- Signup always assigns `VIEWER` to prevent privilege escalation.
- Authorization is enforced in backend routes, not just UI.

## Limitations
- No JWT or server-side session storage.
- Client-side route protection and cookie-based identity are not production-grade.
- No pagination or rate limiting on list endpoints.

## Future Improvements
- Add password hashing and JWT or session storage
- Enforce server-side session validation and role checks with tokens
- Add pagination, sorting, and search for records
