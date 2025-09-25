import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import "./LandingPage.css";
import kreativeLogo from "./kreativelogo.jpg"; 


function LandingPage() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="Checking session..." />;
  }

  if (user && user.role === "patient") {
    return (
      <div className="container mt-5 text-center">
        <h2>Welcome, {user.name || "Patient"} 🦷</h2>
        <p>Select an action below:</p>
        <Link to="/patient/appointment" className="btn btn-primary m-2">
          Book Appointment
        </Link>
        <Link to="/patient/history" className="btn btn-outline-secondary m-2">
          View History
        </Link>
        <Link to="/patient/profile" className="btn btn-outline-info m-2">
          Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Header */}
<header className="site-header shadow-sm">
  <div className="container d-flex justify-content-between align-items-center py-3">
    {/* Logo + Text */}
   <div className="d-flex align-items-center">
  <img src={kreativeLogo} alt="Kreative Dental Logo" className="site-logo me-2" />
  <span className="logo-text">Kreative Dental Clinic</span>
</div>


    <nav>
      <ul className="nav-list d-flex gap-3 mb-0">
        <li><a href="#home" className="nav-link">Home</a></li>
        <li><a href="#about" className="nav-link">About</a></li>
        <li><a href="#contact" className="nav-link">Contact</a></li>
        <li><Link to="/login" className="nav-link">Login</Link></li>
        <li>
          <Link to="/register" className="nav-link btn btn-primary text-white px-3 py-1">
            Register
          </Link>
        </li>
      </ul>
    </nav>
  </div>
</header>


      {/* Hero Section */}
      <section id="home" className="hero-section d-flex align-items-center text-white">
        <div className="container text-center">
          <h1 className="hero-title">
            Your Smile, Our Passion <br /> Kreative Dental & Orthodontics
          </h1>
          <p className="hero-subtitle">
            Trusted dental care for families and individuals.
          </p>
          <div className="hero-buttons mt-4">
            <Link to="/login" className="btn btn-light btn-lg mx-2 shadow">
              Login
            </Link>
            <Link to="/register" className="btn btn-outline-light btn-lg mx-2">
              Register
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section py-5">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-4 mb-4">
              <div className="feature-box p-4 h-100 shadow-sm rounded">
                <i className="bi bi-shield-check fs-1 text-primary"></i>
                <h5 className="mt-3">Safe & Secure</h5>
                <p>We ensure a sterile and hygienic environment in all treatments.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="feature-box p-4 h-100 shadow-sm rounded">
                <i className="bi bi-calendar2-check fs-1 text-success"></i>
                <h5 className="mt-3">Easy Appointment</h5>
                <p>Book your slot online and avoid waiting queues.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="feature-box p-4 h-100 shadow-sm rounded">
                <i className="bi bi-person-heart fs-1 text-danger"></i>
                <h5 className="mt-3">Caring Dentists</h5>
                <p>Experienced, friendly professionals to guide your oral care.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section py-5 bg-primary">
        <div className="container text-center">
          <h2 className="mb-4">About Us</h2>
          <p className="lead">
            Kreative Dental Clinic is committed to providing high-quality dental care
            in a friendly, safe, and comfortable environment. Our team of professionals
            ensures that every patient receives the best oral health solutions tailored to
            their needs.
          </p>
        </div>
      </section>

            {/* Contact Section */}
      <section id="contact" className="contact-section py-5">
        <div className="container text-center">
          <h2 className="mb-4">Contact Us</h2>
          <p className="mb-2">📍 123 Dental Street, Cabuyao City</p>
          <p className="mb-2">📞 +63 912 345 6789</p>
          <p className="mb-3">✉️ kreativeclinic@email.com</p>

          {/* Contact Buttons */}
          <div className="d-flex justify-content-center gap-3 mt-3">
            <a href="mailto:kreativeclinic@email.com" className="btn btn-primary">
              Send Email
            </a>
            {/* Facebook Placeholder */}
            <a
              href="#"
              className="btn btn-outline-primary facebook-btn"
              title="Visit our Facebook Page"
            >
              <i className="bi bi-facebook me-2"></i> Facebook
            </a>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="text-center py-3 bg-dark text-white">
        <p className="mb-0">&copy; {new Date().getFullYear()} Kreative Dental Clinic. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
