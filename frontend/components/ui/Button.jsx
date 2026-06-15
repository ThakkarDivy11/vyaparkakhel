'use client';
import { motion } from 'framer-motion';
import clsx from 'clsx';

// Buttons sit on light alabaster surfaces. The bevel uses a darker shade
// of the same hue underneath, so the button looks like it sits on a
// physical block. Pressing it pushes into the bevel.
const VARIANTS = {
  primary:
    'bg-cafe-royale-500 hover:bg-cafe-royale-400 active:bg-cafe-royale-600 text-black ' +
    'shadow-[0_4px_0_0_var(--color-cafe-royale-800)] ' +
    'hover:shadow-[0_3px_0_0_var(--color-cafe-royale-800)] ' +
    'active:shadow-[0_1px_0_0_var(--color-cafe-royale-800)] active:translate-y-[3px]',
  destructive:
    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white ' +
    'shadow-[0_4px_0_0_#7f1d1d] hover:shadow-[0_3px_0_0_#7f1d1d] ' +
    'active:shadow-[0_1px_0_0_#7f1d1d] active:translate-y-[3px]',
  success:
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white ' +
    'shadow-[0_4px_0_0_#064e3b] hover:shadow-[0_3px_0_0_#064e3b] ' +
    'active:shadow-[0_1px_0_0_#064e3b] active:translate-y-[3px]',
  warning:
    'bg-saffron-500 hover:bg-saffron-400 active:bg-saffron-600 text-black ' +
    'shadow-[0_4px_0_0_#92400e] hover:shadow-[0_3px_0_0_#92400e] ' +
    'active:shadow-[0_1px_0_0_#92400e] active:translate-y-[3px]',
  // Ghost: no fill, dark wine text — used for secondary actions on cream bg
  ghost:
    'bg-transparent hover:bg-murrey-300 text-alabaster-700 ' +
    'border border-murrey-400 hover:border-alabaster-700/30',
};

const SIZES = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-base px-5 py-2.5 rounded-xl',
  lg: 'text-lg px-7 py-3.5 rounded-xl font-semibold',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon = null,
  iconRight = null,
  disabled,
  className,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      whileHover={isDisabled ? undefined : { y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold',
        'transition-[background-color,box-shadow,opacity] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-portage-400/40',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-none',
        SIZES[size] || SIZES.md,
        VARIANTS[variant] || VARIANTS.primary,
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
      ) : icon}
      {children}
      {iconRight && !loading && iconRight}
    </motion.button>
  );
}
