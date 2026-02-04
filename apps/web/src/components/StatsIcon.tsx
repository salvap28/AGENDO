export default function StatsIcon({className=''}){
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="3" height="8" rx="1" fill="url(#g)"/>
      <rect x="10.5" y="7" width="3" height="11" rx="1" fill="url(#g)"/>
      <rect x="17" y="4" width="3" height="14" rx="1" fill="url(#g)"/>
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="24">
          <stop stopColor="#8e7cff"/><stop offset="1" stopColor="#63c7ff"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
