import React from 'react';

interface SteamConnectButtonProps {
  onConnect: () => void;
  className?: string;
}

const SteamConnectButton: React.FC<SteamConnectButtonProps> = ({ onConnect, className }) => (
  <button
    type="button"
    className={`btn btn-outline btn-primary gap-2 ${className || ''}`}
    onClick={onConnect}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="20"
      height="20"
      fill="none"
      className="inline-block align-middle"
    >
      <circle cx="16" cy="16" r="16" fill="#171A21" />
      <path
        d="M24.3 11.7a4.6 4.6 0 1 0-4.6 4.6 4.6 4.6 0 0 0 4.6-4.6zm-1.5 0a3.1 3.1 0 1 1-3.1-3.1 3.1 3.1 0 0 1 3.1 3.1zM11.5 18.8a2.5 2.5 0 1 0 2.5 2.5 2.5 2.5 0 0 0-2.5-2.5zm0 1.5a1 1 0 1 1-1 1 1 1 0 0 1 1-1zm7.3-3.5-2.6 2.6a4.1 4.1 0 0 1-1.6-.3l-3.7-1.2a3.9 3.9 0 1 1 1.2-2.2l3.6 1.2a2.6 2.6 0 0 0 1.1.2l2.6-2.6a3.8 3.8 0 1 1 1.2 2.2zm-9.3-2.1a2.5 2.5 0 1 0 2.5 2.5 2.5 2.5 0 0 0-2.5-2.5zm0 1.5a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"
        fill="#fff"
      />
    </svg>
    Import from Steam
  </button>
);

export default SteamConnectButton;
