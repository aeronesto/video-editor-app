import React from 'react';
import '../styles/Button.css';

function Button({ children, onClick, className, ...props }) {
  return (
    <button 
      className={`custom-button ${className || ''}`} 
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button; 