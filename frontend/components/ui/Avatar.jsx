import clsx from 'clsx';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-2xl',
};

// Avatar — uses real Clerk image when available; falls back to a flat
// monogram on a solid surface. NOT a gradient-circle-with-letter (that's
// the AI cliche flagged by Rulebook §8.1 / §9.33).
export default function Avatar({
  src,
  name = '',
  size = 'md',
  ring = false,
  className,
  ...rest
}) {
  const initial = (name?.trim?.()[0] ?? '?').toUpperCase();
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-bold select-none shrink-0',
        // Flat monogram surface — no gradient
        'bg-alabaster-700 text-murrey-100',
        ring && 'ring-2 ring-alabaster-700/30 ring-offset-2 ring-offset-bg',
        sizeClass,
        className,
      )}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </div>
  );
}
