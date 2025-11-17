import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, hasCredentials } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      setError('Enter your work email to continue.');
      return;
    }
    const ok = login(email);
    if (!ok) {
      setError('Login is incorrect. Please use a valid company email.');
      return;
    }
    navigate('/stock');
  };

  return (
    <section className="page login-page">
      <header>
        <h2>Welcome back</h2>
        <p>
          Sign in with your email. MoySklad credentials are read from env
          variables.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <label>
          Work email
          <input
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="buyer@company.com"
            required
          />
        </label>

        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}

        <button type="submit">Sign in</button>
      </form>

      <p className="hint">
        Only authorized company emails can access the ordering tool.
      </p>

      <p className="hint">
        MoySklad API token:{' '}
        {hasCredentials
          ? 'loaded from VITE_MOYSKLAD_TOKEN.'
          : 'missing – set VITE_MOYSKLAD_TOKEN in .env file.'}
      </p>
    </section>
  );
}
