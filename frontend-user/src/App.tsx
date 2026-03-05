import type { User } from './lib/api';

export interface UserAppProps {
  user: User | null;
}

export default function UserApp({ user }: UserAppProps) {
  return (
    <div className="card">
      <p>User app (companies, schedule, bookings, calendar, settings).</p>
      {user && <p className="text-muted">Logged in as {user.email}</p>}
    </div>
  );
}
