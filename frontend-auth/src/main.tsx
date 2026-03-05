import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';

const onLogin = (token: string, user: { id: string; email: string; name: string; role: string }) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event('auth:login'));
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<App onLogin={onLogin} />} />
        <Route path="/register" element={<App onLogin={onLogin} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
