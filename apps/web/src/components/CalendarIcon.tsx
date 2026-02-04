export default function CalendarIcon({className=''}){
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="url(#g)" strokeWidth="1.6" fill="rgba(255,255,255,0.04)"/>
      <path d="M3 9h18" stroke="url(#g)" strokeWidth="1.6"/>
      <circle cx="8" cy="13" r="1.4" fill="#e8ecf3"/>
      <circle cx="12" cy="13" r="1.4" fill="#e8ecf3"/>
      <circle cx="16" cy="13" r="1.4" fill="#e8ecf3"/>
      <defs>
        <linearGradient id="g" x1="0" x2="24"><stop stopColor="#8e7cff"/><stop offset="1" stopColor="#63c7ff"/></linearGradient>
      </defs>
    </svg>
  );
}
