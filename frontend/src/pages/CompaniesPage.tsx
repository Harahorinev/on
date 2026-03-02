import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { companiesApi } from '../lib/api';
import type { Company } from '../lib/api';

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    companiesApi
      .list()
      .then((r) => setCompanies(r.data))
      .catch(() => setError('Не удалось загрузить список компаний'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading-placeholder">Загрузка…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <h1>Компании</h1>
      <div className="stack">
        {companies.map((c) => (
          <div key={c.id} className="card">
            <h3 className="mt-0">{c.name}</h3>
            {c.description && <p>{c.description}</p>}
            <Link to={`/companies/${c.id}/schedule`} className="btn btn-primary">
              Расписание и запись
            </Link>
          </div>
        ))}
        {companies.length === 0 && <p>Пока нет компаний.</p>}
      </div>
    </>
  );
}
