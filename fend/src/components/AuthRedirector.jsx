import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function AuthRedirector() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading) return;

    const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
    if (user && publicRoutes.includes(location.pathname)) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'staff') navigate('/staff');
      else if (user.role === 'patient') navigate('/patient');
    }
  }, [user, authLoading, location.pathname, navigate]);

  if (authLoading) {
    return <LoadingSpinner message="Checking session..." />;
  }

  return null;
}
