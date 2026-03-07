import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  indigoColor?: string;
  coralColor?: string;
}

/**
 * Fund Her Future - Brand Logo
 * 
 * A minimalist SVG component integrating two core concepts:
 * 1. An open book (symbolizing education and knowledge)
 * 2. A central spark/star (symbolizing growth, future, and empowerment)
 */
export const Logo: React.FC<LogoProps> = ({ 
  className = "w-8 h-8", 
  indigoColor = "#1E3A8A", // Deep Indigo/Navy (Tailwind blue-900)
  coralColor = "#FF7F50", // Warm Coral 
  ...props 
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      {...props}
    >
      {/* 
        Education Base: Open Book / Subtle Cap 
        Sleek, curving paths represent pages opening into the future.
      */}
      <path
        d="M16 26C16 26 9.5 21 2.5 21V7.5C9.5 7.5 16 12 16 12C16 12 22.5 7.5 29.5 7.5V21C22.5 21 16 26 16 26Z"
        fill={indigoColor}
        className="transition-colors duration-300"
      />
      
      {/* 
        Empowerment Spark: Rising from the book 
        A clean, geometric 4-point star representing a bright future.
        Positioned to rest perfectly in the center fold of the book.
      */}
      <path
        d="M16 2C16 6.5 18 8.5 22.5 8.5C18 8.5 16 10.5 16 15C16 10.5 14 8.5 9.5 8.5C14 8.5 16 6.5 16 2Z"
        fill={coralColor}
        className="transition-colors duration-300 drop-shadow-sm"
      />
    </svg>
  );
};

export default Logo;
