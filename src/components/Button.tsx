import React from 'react';

// Define the props for the Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  // onClick is already part of ButtonHTMLAttributes, but can be explicitly defined if needed for clarity or specific overrides
  // onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, className, ...props }) => {
  return (
    <button 
      className={`custom-button ${className || ''}`} 
      onClick={onClick}
      {...props} // Spreads other valid button attributes like 'disabled', 'type', etc.
    >
      {children}
    </button>
  );
}

export default Button; 