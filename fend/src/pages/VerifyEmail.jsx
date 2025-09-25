import { useState } from 'react';
import api from '../api/api';

function VerifyEmail() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const resendLink = async () => {
    try {
      setSending(true);
      const res = await api.post('/email/verification-notification');
      setMessage('Verification link resent to your email!');
    } catch (err) {
      setMessage('Failed to resend. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm p-4" style={{ maxWidth: '500px', width: '100%' }}>
        <h3 className="text-center mb-3">Verify Your Email</h3>
        <p className="text-center">A verification link has been sent to your email. Please check your inbox.</p>

        {message && <div className="alert alert-info text-center">{message}</div>}

        <div className="text-center mt-3">
          <button onClick={resendLink} className="btn btn-outline-primary" disabled={sending}>
            {sending ? 'Resending...' : 'Resend Verification Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
