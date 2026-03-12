# Database schema (SQLite)

Backend uses SQLite; tables are created in `backend/src/db.ts`.

## Tables

| Table | Purpose |
|-------|---------|
| `users` | Accounts (USER / COMPANY role). |
| `companies` | Companies owned by a user (owner_id → users.id). |
| `slots` | Time slots per company (company_id → companies.id). |
| `bookings` | User bookings for slots (slot_id, user_id); UNIQUE(slot_id, user_id). |
| `directions` | Company directions/categories (company_id → companies.id). |
| `employee_directions` | Many-to-many: which employees are linked to which directions (see below). |
| `user_events` | Personal calendar events (user_id → users.id). |
| `user_preferences` | User settings JSON (user_id → users.id). |

## employee_directions (B91)

- **Columns:** `employee_id` (TEXT), `direction_id` (TEXT, FK → directions.id). Composite PRIMARY KEY (employee_id, direction_id).
- **Purpose:** Links employees to directions (e.g. “employee X works in direction Y”). Used for future features (B44 Employee entity, B50 Employee role and user link).
- **Current use:** When a direction is deleted, rows with that `direction_id` are removed so the table stays consistent. No API yet creates or reads these rows.
- **Note:** `employee_id` has no FK constraint yet; it will reference `users.id` (or an employees table) when the employee feature is implemented.
