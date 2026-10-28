import { cn } from "@/lib/utils";

function iconWrapper(
  svg: React.ReactNode,
  className?: string
) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {svg}
    </svg>
  );
}

export function DieIcon({ className }: { className?: string }) {
  return iconWrapper(
    <>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="7.5" cy="7.5" r="1.8" fill="currentColor" />
      <circle cx="16.5" cy="7.5" r="1.8" fill="currentColor" />
      <circle cx="7.5" cy="16.5" r="1.8" fill="currentColor" />
      <circle cx="16.5" cy="16.5" r="1.8" fill="currentColor" />
    </>,
    className
  );
}

export function ScrollIcon({ className }: { className?: string }) {
  return iconWrapper(
    <>
      <path
        d="M5 6 h14 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 h-14 a2 2 0 0 1 -2 -2 v-10 a2 2 0 0 1 2 -2 z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 6 c-2 0 -2 3 -2 5 s0 5 2 5 M19 6 c2 0 2 3 2 5 s0 5 -2 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 10 h8 M8 14 h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>,
    className
  );
}

export function BrickIcon({ className }: { className?: string }) {
  return iconWrapper(
    <>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 10 h18 M3 15 h18 M12 5 v5 M12 15 v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>,
    className
  );
}

export function HexTilesIcon({ className }: { className?: string }) {
  return iconWrapper(
    <>
      <path
        d="M6 16 v-4 L6 9 L9 7.5 L12 9 L12 12 L12 16 L9 17.5 L6 16 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 16 v-6 L12 7 L15 5.5 L18 7 L18 13 L18 16 L15 17.5 L12 16 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M18 16 v-8 L18 5 L21 3.5 L24 5 L24 13 L24 16 L21 17.5 L18 16 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </>,
    className
  );
}
