import { useId } from 'react';

export default function Sparkle({ size = 28, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className={`sparkle aira-logo ${className}`}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-0`} x1="18" y1="6" x2="44" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E7FFF8" />
          <stop offset="1" stopColor="#89E6D6" />
        </linearGradient>
        <linearGradient id={`${id}-1`} x1="36" y1="10" x2="58" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9FBF4" />
          <stop offset="1" stopColor="#9FE0DC" />
        </linearGradient>
        <linearGradient id={`${id}-2`} x1="38" y1="30" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FAD4E4" />
          <stop offset="1" stopColor="#F0A3C6" />
        </linearGradient>
        <linearGradient id={`${id}-3`} x1="40" y1="46" x2="20" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4A8C6" />
          <stop offset="1" stopColor="#EB6EAA" />
        </linearGradient>
        <linearGradient id={`${id}-4`} x1="24" y1="46" x2="8" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E996CA" />
          <stop offset="1" stopColor="#D15BB0" />
        </linearGradient>
        <linearGradient id={`${id}-5`} x1="8" y1="16" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D4C4F6" />
          <stop offset="1" stopColor="#E9A6D4" />
        </linearGradient>
      </defs>
      <g transform="translate(32 32)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-5-17.2H10.8V-1.6" stroke={`url(#${id}-0)`} transform="rotate(-12)" />
        <path d="M-5-17.2H10.8V-1.6" stroke={`url(#${id}-1)`} transform="rotate(48)" />
        <path d="M-5-17.2H10.8V-1.6" stroke={`url(#${id}-2)`} transform="rotate(108)" />
        <path d="M-5-17.2H10.8V-1.6" stroke={`url(#${id}-3)`} transform="rotate(168)" />
        <path d="M-5-17.2H10.8V-1.6" stroke={`url(#${id}-4)`} transform="rotate(228)" />
        <path d="M-5-17.2H10.8V-1.6" stroke={`url(#${id}-5)`} transform="rotate(288)" />
      </g>
    </svg>
  );
}
