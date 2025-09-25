import React from 'react';

function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50" style={{ zIndex: 1050 }}>
      <div className="bg-white p-4 rounded shadow text-center">
        <div className="spinner-border text-primary mb-3" role="status" />
        <div>{message}</div>
      </div>
    </div>
  );
}

export default LoadingSpinner;
