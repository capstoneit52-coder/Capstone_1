import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import LoadingSpinner from "../components/LoadingSpinner";
import AuthLayout from "../layouts/AuthLayout";
import { getFingerprint } from "../utils/getFingerprint";
import "./Logs.css"; // ✅ Your custom CSS
import logo from "./logo.png";


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await api.get("/sanctum/csrf-cookie");

      const fingerprint = await getFingerprint();

      const res = await api.post("/api/login", {
        email,
        password,
        device_id: fingerprint,
      });

      console.log("Login response:", res.data);
      const user = res.data.user || res.data;

      setMessage("Login successful!");

      setTimeout(() => {
        if (user.role === "admin") {
          navigate("/admin");
        } else if (user.role === "staff") {
          navigate("/staff");
        } else if (user.role === "patient") {
          navigate("/patient");
        } else {
          setMessage("Login successful, but no dashboard yet for this role.");
        }
      }, 150);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {loading && <LoadingSpinner message="Logging in..." />}

      <div className="login-container">
        {/* Left Side - Welcome */}
        <div className="login-left">
  <div className="logo">
   
    <img src={logo} alt="Kreative Dental Logo" className="site-logo" />
    
  </div>


          <h1>Hello, welcome!</h1>
        <p className="login-description">
  Please log in to access your appointments, treatment history, and personalized dental care. <br />
  Your oral health is just a click away!
</p>

        </div>

        {/* Right Side - Form */}
        <div className="login-right">
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@mail.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="form-options">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn-primary">
              Login
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/register")}
            >
              Sign up
            </button>

            {message && <p className="login-message">{message}</p>}

            <div className="social-login">
{/* <p>Follow</p> */}
{/* <div className="social-icons">
  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
    <i className="fab fa-facebook-f"></i>
  </a>
  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
    <i className="fab fa-twitter"></i>
  </a>
  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
    <i className="fab fa-instagram"></i>
  </a>
</div> */}

            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

export default Login;
