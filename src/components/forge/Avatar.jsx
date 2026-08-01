export function Avatar({ name = '', src, size = 32, className = '' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return <img src={src} alt={name} className={`rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <div className={`flex items-center justify-center rounded-full bg-surface-sunken border border-line text-xs font-semibold text-ink-2 ${className}`}
         style={{ width: size, height: size }}>
      {initials || '?'}
    </div>
  );
}
