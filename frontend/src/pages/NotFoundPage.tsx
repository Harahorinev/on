import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="card not-found-card">
      <h1>404</h1>
      <p className="page-description">Страница не найдена.</p>
      <p>
        <Link to="/" className="btn btn-primary">
          На главную
        </Link>
      </p>
    </div>
  );
}
