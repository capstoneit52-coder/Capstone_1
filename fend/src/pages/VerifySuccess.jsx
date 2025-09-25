import { Link } from 'react-router-dom';

function VerifySuccess() {
  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm p-4" style={{ maxWidth: '500px', width: '100%' }}>
        <h2 className="text-center mb-3 text-success">
          <i className="bi bi-check-circle-fill me-2"></i>Email Verified!
        </h2>
        <p className="text-center">Your email has been successfully verified. You can now log in to your account.</p>

        <div className="text-center mt-4">
          <Link to="/login" className="btn btn-primary">
            <i className="bi bi-box-arrow-in-right me-2"></i>
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifySuccess;
