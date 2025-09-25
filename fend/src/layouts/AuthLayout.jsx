import React from 'react';

function AuthLayout({ children }) {
  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}

export default AuthLayout;
