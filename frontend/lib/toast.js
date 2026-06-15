// Thin wrapper around sonner so the rest of the app imports a stable API
// from one place. Add app-specific toast variants here.
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message, opts) => sonnerToast.success(message, opts),
  error:   (message, opts) => sonnerToast.error(message, opts),
  info:    (message, opts) => sonnerToast(message, opts),
  warning: (message, opts) => sonnerToast.warning(message, opts),
  // Show "Coming soon" toast for locked features in Phase 1
  comingSoon: (feature = 'This feature') =>
    sonnerToast.info(`${feature} is coming soon`, {
      description: "We're focused on Play with Friends for the first release.",
    }),
};

export default toast;
