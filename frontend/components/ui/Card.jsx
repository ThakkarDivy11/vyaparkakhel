import clsx from 'clsx';

// Light-mode card pattern: hairline border (rgba(0,0,0,0.08), Rulebook §2.3a)
// for edge definition + neutral shadow for elevation. Both at low intensity
// — this isn't the "border AND heavy shadow" anti-pattern, it's the iOS /
// Linear / Vercel approach where a 1px hairline crisps the edge and a soft
// shadow signals lift.
const VARIANTS = {
  default:
    'bg-surface border border-border shadow-(--shadow-sm)',
  elevated:
    'bg-surface border border-border shadow-(--shadow-md)',
  flat:
    'bg-surface-2 border border-border',
  none: '',
};

export default function Card({
  variant = 'default',
  className,
  children,
  ...rest
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl',
        variant in VARIANTS ? VARIANTS[variant] : VARIANTS.default,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
