type ChevronProps = {
  dir?: 'left' | 'right';
};

export default function Chevron({ dir = 'right' }: ChevronProps) {
  const rotation = dir === 'left' ? 'rotate(180deg)' : 'none';
  return (
    <svg
      className="calendar-chevron"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-hidden="true"
      focusable="false"
      style={{ transform: rotation }}
    >
      <path
        d="M10 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
