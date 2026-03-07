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
      {/* 1. Education Base: Open Book with Page Definition */}
      <path
        d="M16 29C16 29 8 24 2 24V16C8 16 16 21 16 21C16 21 24 16 30 16V24C24 24 16 29 16 29Z"
        fill={darkColor}
        className="transition-colors duration-300"
      />
      {/* Subtle Book Page Lines */}
      <path d="M4 22.5C9 22.5 14.5 26.5 14.5 26.5M28 22.5C23 22.5 17.5 26.5 17.5 26.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M5 20.5C9.5 20.5 14.5 24 14.5 24M27 20.5C22.5 20.5 17.5 24 17.5 24" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.2" />

      {/* 2. Empowerment: Magical Sparks floating in the background */}
      <path d="M6 9 L6.5 11 L8.5 11.5 L6.5 12 L6 14 L5.5 12 L3.5 11.5 L5.5 11 Z" fill={lightColor} opacity="0.6" className="transform origin-center hover:scale-110 transition-transform duration-500" />
      <path d="M26 12 L26.5 13.5 L28 14 L26.5 14.5 L26 16 L25.5 14.5 L24 14 L25.5 13.5 Z" fill={darkColor} opacity="0.7" className="transform origin-center hover:scale-110 transition-transform duration-500 delay-150" />

      {/* 3. Female Figure: Graceful Head & Dress Silhouette */}
      <circle cx="16" cy="11" r="3.5" fill={lightColor} className="transition-colors duration-300" />
      <path
        d="M16 15C11 15 9 19.5 9 24C9 26 16 28.5 16 28.5C16 28.5 23 26 23 24C23 19.5 21 15 16 15Z"
        fill={lightColor}
        className="transition-colors duration-300"
      />
      {/* Dress detail: Subtle Sash / Form Definition */}
      <path d="M16 15 C13 18 13 22 16 24 C19 22 19 18 16 15Z" fill="#FFFFFF" opacity="0.15" />

      {/* 4. Future/Success: Detailed Graduation Cap & Tassel */}
      <polygon points="16,3 7,7 16,11 25,7" fill={darkColor} className="transition-colors duration-300" />
      {/* Cap 3D Depth Flap shadow */}
      <polygon points="7,7 16,11 25,7 16,9" fill="#000000" opacity="0.15" />
      {/* Cap Center Button */}
      <ellipse cx="16" cy="7" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.4" />
      {/* Tassel String draped over the side */}
      <path d="M16 7 Q24 7 24.5 10 V14" stroke={darkColor} strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Tassel Fringe end */}
      <polygon points="24,14 25,14 25.5,16.5 23.5,16.5" fill={darkColor} />
    </svg>
  );
};

export default Logo;
