import type { User } from './lib/api';
import { CompanyPage } from './pages/CompanyPage';

export interface CompanyAppProps {
  user: User | null;
  notifySuccess: (msg: string) => void;
}

export default function CompanyApp({ user, notifySuccess }: CompanyAppProps) {
  return <CompanyPage user={user} notifySuccess={notifySuccess} />;
}
