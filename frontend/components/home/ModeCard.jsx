'use client';
import clsx from 'clsx';
import { Lock, ChevronRight } from 'lucide-react';

// One game-mode card. Active = clickable + hover lift. Locked = visibly
// disabled with a Lock pill, click triggers the onLockedClick (toast).
//
// Animation properties are explicit (Rulebook §5.4 / Animations doc — no
// `transition-all` — only the props we change).
export default function ModeCard({
  icon: Icon,
  title,
  subtitle,
  active = false,
  onClick,
  onLockedClick,
  accentClass = 'from-portage-500 to-portage-700',
}) {
  const handleClick = () => {
    if (active) onClick?.();
    else onLockedClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'group relative w-full text-left rounded-2xl overflow-hidden cursor-pointer',
        'bg-surface border border-border',
        // Explicit transition properties — never `transition-all`
        'transition-[transform,box-shadow,opacity] duration-200 ease-out',
        // Active: subtle resting shadow → strong lift on hover.
        // Locked: dimmed, slight wake on hover so it still responds.
        active
          ? 'shadow-(--shadow-sm) hover:-translate-y-0.5 hover:shadow-(--shadow-lg) active:translate-y-0 active:shadow-(--shadow-sm)'
          : 'shadow-(--shadow-sm) opacity-70 hover:opacity-90',
        'active:scale-[0.99]',
      )}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Icon disc */}
        <div
          className={clsx(
            'shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-white',
            'shadow-[0_2px_6px_rgba(139,0,74,0.18)]',
            'bg-linear-to-br',
            accentClass,
          )}
        >
          <Icon size={28} strokeWidth={2.25} />
        </div>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[var(--color-text)] leading-tight">
              {title}
            </h3>
            {!active && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                <Lock size={10} />
                Soon
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted mt-0.5 truncate">
            {subtitle}
          </p>
        </div>

        {active && (
          <ChevronRight
            size={22}
            className="text-text-muted group-hover:text-text group-hover:translate-x-0.5 transition-[color,transform] duration-200 ease-out shrink-0"
          />
        )}
      </div>
    </button>
  );
}
