import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/api';
import AuthLayout from '../layouts/AuthLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getFingerprint } from '../utils/getFingerprint'; // ✅ import utility

function ForgotPassword() {
  const location = useLocation();
  const prefillEmail = location.state?.email || '';
  const fromProfile = location.state?.fromProfile || false;

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(prefillEmail);
  }, [prefillEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      setLoading(true);
      await api.get('/sanctum/csrf-cookie');

      const fingerprint = await getFingerprint(); // ✅ retrieve fingerprint

      const res = await api.post('/forgot-password', {
        email: email,
        device_id: fingerprint, // ✅ send fingerprint to backend
      });

      setMessage(res.data.message || 'Reset link sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {loading && <LoadingSpinner message="Sending reset link..." />}

      {/* ✅ Full page center using px */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          
          width: "1300px",
          height: "720px",
          margin:"0 auto",
       
          padding: '20px', // px for spacing
    
        }}
      >
        <div
          className="card shadow-sm p-4"
          style={{
            width: '400px', // ✅ fixed px width
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          
          }}
        >
          <h3 className="text-center mb-4">
            {fromProfile ? 'Send Password Reset Link' : 'Forgot Password'}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">
                <i className="bi bi-envelope me-2" />
                Email Address
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                readOnly={fromProfile}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className="btn btn-primary w-100">
              <i className="bi bi-send me-2" />
              Send Reset Link
            </button>
          </form>

          {message && (
            <div className="alert alert-success text-center mt-3">{message}</div>
          )}
          {error && (
            <div className="alert alert-danger text-center mt-3">{error}</div>
          )}

          <div className="text-center mt-3">
            <Link to="/login" className="d-block text-decoration-none text-primary">
              <i className="bi bi-arrow-left me-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default ForgotPassword;
