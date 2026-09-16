type IconProps = { className?: string };

const base = (className = "size-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const CommentIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
  </svg>
);
export const XIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const WaveIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V10m0 0V5.5a1.5 1.5 0 0 1 3 0V12m0-3.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.2 15a1.5 1.5 0 0 1 2.4-1.8L7 15" />
  </svg>
);
export const ChevronLeft = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
export const SendIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
  </svg>
);
export const HomeIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V10Z" />
  </svg>
);
export const UserIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const SettingsIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);
export const PlusIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const ImageIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);
