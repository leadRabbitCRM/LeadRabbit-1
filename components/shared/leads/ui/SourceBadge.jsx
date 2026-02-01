import { FaFacebook, FaInstagram } from "react-icons/fa";

export const getSourceBadgeStyles = (source) => {
  switch (source) {
    case 'facebook':
      return {
        bgColor: 'bg-white',
        textColor: 'text-blue-600',
      };
    case 'instagram':
      return {
        bgColor: 'bg-pink-100',
        textColor: 'text-pink-600',
      };
    case '99acres':
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
      };
  }
};

export const SourceBadgeIcon = ({ source, className = "w-5 h-5 sm:w-6 sm:h-6" }) => {
  const { textColor } = getSourceBadgeStyles(source);

  switch (source) {
    case 'facebook':
      return <FaFacebook className={`${className} ${textColor}`} />;
    
    case 'instagram':
      return <FaInstagram className={`${className} ${textColor}`} />;
    
    case '99acres':
      return (
        <span className={`${textColor} font-bold text-sm sm:text-base`}>99</span>
      );
    
    default:
      return (
        <svg className={`${className} ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export default function SourceBadge({ source, size = "sm" }) {
  if (!source) return null;

  const { bgColor } = getSourceBadgeStyles(source);
  const sizeClasses = size === 'lg' 
    ? 'w-12 h-12 sm:w-14 sm:h-14'
    : 'w-10 h-10 sm:w-12 sm:h-12';
  const iconSize = size === 'lg' 
    ? 'w-6 h-6 sm:w-7 sm:h-7'
    : 'w-5 h-5 sm:w-6 sm:h-6';

  return (
    <div className={`flex-shrink-0 ${sizeClasses} rounded-xl flex items-center justify-center ${bgColor} border border-gray-300`}>
      <SourceBadgeIcon source={source} className={iconSize} />
    </div>
  );
}
