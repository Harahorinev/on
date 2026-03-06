/// <reference types="vite/client" />

declare module '*.css' {
  const src: string;
  export default src;
}

declare module 'auth/AuthApp' {
  import type { User } from './lib/api';
  const AuthApp: React.FC<{ onLogin: (token: string, user: User) => void }>;
  export default AuthApp;
}

declare module 'user/UserApp' {
  import type { User } from './lib/api';
  const UserApp: React.FC<{ user: User | null; notifySuccess: (msg: string) => void }>;
  export default UserApp;
}

declare module 'company/CompanyApp' {
  import type { User } from './lib/api';
  const CompanyApp: React.FC<{ user: User | null; notifySuccess: (msg: string) => void }>;
  export default CompanyApp;
}
