import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Fund Her Future - Brand Logo
 * 
 * A female-oriented SVG logo integrating:
 * 1. An open book base (education/scholarship)
 * 2. A central female figure (empowerment)
 * 3. A graduation cap (future/success)
 * Colors focus exclusively on the brand's peach and pink theme.
 */
export const Logo: React.FC<LogoProps> = ({
  className = "w-8 h-8",
  darkColor = "#FF6B8B", // Vibrant Pink
  lightColor = "#FFA089", // Peach Pink
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
      {/* Education Base: Open Book */}
      <path
        d="M16 28C16 28 9 23 3 23V15C9 15 16 20 16 20C16 20 23 15 29 15V23C23 23 16 28 16 28Z"
        fill={darkColor}
        className="transition-colors duration-300"
      />

      {/* Female Figure: Head & Dress/Torso */}
      <circle cx="16" cy="9" r="3" fill={lightColor} className="transition-colors duration-300" />
      <path
        d="M16 13.5C11.5 13.5 9.5 18 9.5 22C9.5 23.5 16 26 16 26C16 26 22.5 23.5 22.5 22C22.5 18 20.5 13.5 16 13.5Z"
        fill={lightColor}
        className="transition-colors duration-300"
      />

      {/* Graduation Cap */}
      <polygon points="16,3 10,5.5 16,8 22,5.5" fill={darkColor} className="transition-colors duration-300" />
      <path d="M22 5.5V9" stroke={darkColor} strokeWidth="1.5" className="transition-colors duration-300" />
    </svg>
  );
};

export default Logo;
