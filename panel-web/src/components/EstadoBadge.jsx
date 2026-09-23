export default function EstadoBadge({ estado }) {
  const online = estado === 'online';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        online ? 'bg-green-500/15 text-green-400' : 'bg-slate-500/15 text-slate-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-400' : 'bg-slate-500'}`} />
      {online ? 'En linea' : 'Desconectada'}
    </span>
  );
}
