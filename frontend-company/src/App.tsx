import type { User } from './lib/api';

export interface CompanyAppProps {
  user: User | null;
}

export default function CompanyApp({ user }: CompanyAppProps) {
  return (
    <div className="card">
      <p>Company app (cabinet, slots, directions).</p>
      {user && <p className="text-muted">Logged in as {user.email}</p>}
    </div>
  );
}
