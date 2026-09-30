export default function EstadoBadge({ estado }) {
  const online = estado === 'online';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        online ? 'bg-brand-500/15 text-brand-400' : 'bg-slate-500/15 text-slate-400'
      }`}
    >
      <span className="relative flex w-1.5 h-1.5">
        {online && (
          <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-brand-400 opacity-75" />
        )}
        <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${online ? 'bg-brand-400' : 'bg-slate-500'}`} />
      </span>
      {online ? 'En linea' : 'Desconectada'}
    </span>
  );
}
