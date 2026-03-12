/**
 * Typed DB row interfaces for SQLite query results.
 * B89: Replace `as any` with these types across routes.
 */

export interface BookingRow {
  id: string;
  slot_id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export interface SlotRow {
  id: string;
  company_id: string;
  start_at: string;
  end_at: string;
  capacity: number;
  status: string;
  title: string | null;
  description: string | null;
  location: string | null;
}

/** Slot row with company columns (SELECT s.*, c.id as cid, c.name as cname). */
export interface SlotRowWithCompany extends SlotRow {
  cid: string;
  cname: string;
}

export interface UserEventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  created_at: string;
}

export interface UserEventRowMin {
  id: string;
  user_id: string;
}

export interface DirectionRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface EmployeeRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_at: string;
}

/** Companies list row with owner join (oid, owner_email, owner_name). */
export interface CompanyRowWithOwner {
  id: string;
  name: string;
  description: string | null;
  timezone: string;
  oid: string;
  owner_email: string;
  owner_name: string;
}

/** Booking + slot + company joined (GET /bookings/me, GET /bookings/:id). */
export interface BookingJoinedRow extends BookingRow {
  s_id: string;
  company_id: string;
  start_at: string;
  end_at: string;
  capacity: number;
  s_status: string;
  title: string | null;
  description: string | null;
  location: string | null;
  c_id: string;
  c_name: string;
}
