import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthLayout from '../layouts/AuthLayout';
import logo from "../pages/logo.png"; // ✅ Use the same logo as login
import "./register.css"; 
function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    contact_number: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!/^09\d{9}$/.test(form.contact_number)) {
      newErrors.contact_number = "Contact number must start with 09 and be 11 digits.";
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(form.password)) {
      newErrors.password = "Password must have at least 1 uppercase, 1 lowercase, 1 number, and be 8+ characters.";
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validate()) return;

    try {
      setLoading(true);
      await api.get('/sanctum/csrf-cookie');

      const res = await api.post('/api/register', {
        name: form.name,
        email: form.email,
        contact_number: form.contact_number,
        password: form.password,
        password_confirmation: form.confirmPassword
      });

      localStorage.setItem('token', res.data.token);
      setMessage('Registration successful!');

      setForm({
        name: '',
        email: '',
        contact_number: '',
        password: '',
        confirmPassword: ''
      });

      setErrors({});

      setTimeout(() => navigate('/verify-email'), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {loading && <LoadingSpinner message="Registering patient..." />}
      
      <div className="auth-container">
        {/* ✅ Left Side (Logo + Message) */}
        <div className="auth-left">
          <img src={logo} alt="Kreative Dental Logo" className="auth-logo" />
          <h2 className="auth-title">Create Your Account</h2>
          <p className="auth-description">
            Join us today and manage your appointments, treatment history, and profile in one place.
          </p>
        </div>

        {/* ✅ Right Side (Register Form) */}
        <div className="auth-right">
          <div className="card shadow-sm p-4">
            <h3 className="text-center mb-4">Patient Registration</h3>
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="form-label"><i className="bi bi-person me-2" />Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-envelope me-2" />Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-telephone me-2" />Contact Number</label>
                <input
                  type="text"
                  className={`form-control ${errors.contact_number ? 'is-invalid' : ''}`}
                  name="contact_number"
                  value={form.contact_number}
                  onChange={handleChange}
                  required
                />
                {errors.contact_number && <div className="invalid-feedback">{errors.contact_number}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-lock me-2" />Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label"><i className="bi bi-lock-fill me-2" />Confirm Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
              </div>

              <button type="submit" className="btn btn-primary w-100">
                <i className="bi bi-person-plus me-2" />
                Register
              </button>
            </form>

            {message && <div className="alert alert-info text-center mt-3">{message}</div>}

            <div className="text-center mt-3">
              <Link to="/login" className="d-block text-decoration-none text-primary">
                <i className="bi bi-box-arrow-in-right me-2" />
                Already have an account? Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default Register;
