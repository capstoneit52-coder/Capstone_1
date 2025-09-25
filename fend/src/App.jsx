import { useEffect } from 'react';
import AppRouter from './router';
import { getFingerprint } from './utils/getFingerprint';
import { useAuth } from './hooks/useAuth';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { authLoading } = useAuth();

  useEffect(() => {
    getFingerprint(); // ✅ still runs once
  }, []);

  if (authLoading) {
    return <LoadingSpinner message="Checking session..." />;
  }

  return <AppRouter />;
}

export default App;
