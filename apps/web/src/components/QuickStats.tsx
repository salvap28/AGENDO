
'use client';
export default function QuickStats() {
  const items = [
    { label: 'Sueño (7d)', value: '7.4 h' },
    { label: 'Bloques cumplidos', value: '82 %' },
    { label: 'Café / día', value: '1.2' },
    { label: 'Humor (7d)', value: '7.8/10' },
  ];
  return (
    <>
      {items.map((it,i)=>(
        <div key={i}
          role="button" tabIndex={0}
          onClick={()=>{}}
          onKeyDown={()=>{}}
          className="card p-4 cursor-pointer transition-base"
        >
          <div className="text-mist text-sm">{it.label}</div>
          <div className="text-warm text-2xl font-semibold mt-1">{it.value}</div>
        </div>
      ))}
    </>
  );
}
