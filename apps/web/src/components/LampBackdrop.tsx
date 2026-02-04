export default function LampBackdrop(){
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-24 right-[-10%] h-[520px] w-[520px] rounded-full blur-3xl opacity-40 animate-breath"
           style={{ background:'radial-gradient(circle at 30% 30%, var(--aura1), transparent 60%)' }}/>
      <div className="absolute bottom-[-10%] left-[-10%] h-[580px] w-[580px] rounded-full blur-3xl opacity-40 animate-float"
           style={{ background:'radial-gradient(circle at 60% 40%, var(--aura2), transparent 60%)' }}/>
    </div>
  )
}
