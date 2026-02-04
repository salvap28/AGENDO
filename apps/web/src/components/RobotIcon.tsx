export default function RobotIcon({className=''}:{className?:string}){
  return (
    <svg className={className + ' robot-glow'} width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="7" width="16" height="11" rx="5" stroke="url(#g)" strokeWidth="1.6" fill="rgba(255,255,255,0.06)"/>
      <circle cx="9" cy="12" r="1.6" fill="#e8ecf3"/>
      <circle cx="15" cy="12" r="1.6" fill="#e8ecf3"/>
      <path d="M12 4v2" stroke="url(#g)" strokeWidth="1.6" strokeLinecap="round"/>
      <defs>
        <linearGradient id="g" x1="0" x2="24" y1="0" y2="0">
          <stop stopColor="#8e7cff"/><stop offset="1" stopColor="#63c7ff"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
