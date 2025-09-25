import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/api';
import AuthLayout from '../layouts/AuthLayout';
import LoadingSpinner from '../components/LoadingSpinner';

function ResetPassword() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const navigate = useNavigate();
  const [form, setForm] = useState({
    email,
    password: '',
    password_confirmation: '',
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrors({});

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(form.password)) {
      setErrors({ password: 'Password must have at least 1 uppercase, 1 lowercase, 1 number, and be 8+ characters.' });
      return;
    }

    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: 'Passwords do not match.' });
      return;
    }

    try {
      setLoading(true);
      await api.get('/sanctum/csrf-cookie');

      const res = await api.post('/reset-password', {
        token,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation
      });

      setMessage('Password has been reset! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {loading && <LoadingSpinner message="Resetting password..." />}
      <div className="card shadow-sm p-4" style={{ width: '100%', maxWidth: '500px' }}>
        <h3 className="text-center mb-4">Reset Password</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-envelope me-2" />Email
            </label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              required
              readOnly
            />
          </div>

          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-lock me-2" />New Password
            </label>
            <input
              type="password"
              name="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-lock-fill me-2" />Confirm Password
            </label>
            <input
              type="password"
              name="password_confirmation"
              className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`}
              value={form.password_confirmation}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            {errors.password_confirmation && <div className="invalid-feedback">{errors.password_confirmation}</div>}
          </div>

          <button type="submit" className="btn btn-primary w-100">
            <i className="bi bi-shield-lock me-2" />Reset Password
          </button>
        </form>

        {message && <div className="alert alert-info text-center mt-3">{message}</div>}

        <div className="text-center mt-3">
          <Link to="/login" className="text-decoration-none text-primary">
            <i className="bi bi-box-arrow-in-left me-2" />
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default ResetPassword;
