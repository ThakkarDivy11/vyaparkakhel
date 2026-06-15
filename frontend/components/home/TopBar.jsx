'use client';
import { Pencil, Settings, Users } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import Avatar from '@/components/ui/Avatar';

// Top bar of the lobby — profile pill on the left, settings + clerk profile
// on the right. Uses semantic role tokens (Rulebook §2.1) so a future theme
// change just edits globals.css.
export default function TopBar({
  displayName,
  avatarUrl,
  onEditName,
  onOpenSettings,
  onOpenFriends,
}) {
  return (
    <div className="w-full flex items-center justify-between gap-4">
      {/* Profile pill — clickable, opens display-name editor */}
      <button
        onClick={onEditName}
        className="group inline-flex items-center gap-3 bg-surface border border-border rounded-full pl-1.5 pr-4 py-1.5 shadow-(--shadow-sm) hover:shadow-(--shadow-md) transition-shadow duration-150 ease-out"
      >
        <Avatar src={avatarUrl} name={displayName} size="md" />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
            Player
          </span>
          <span className="text-sm font-bold text-text">
            {displayName || 'Set name'}
          </span>
        </div>
        <Pencil
          size={14}
          className="text-text-muted group-hover:text-text transition-colors duration-150 ease-out"
        />
      </button>

      {/* Right cluster: friends, settings, clerk profile */}
      <div className="flex items-center gap-2">
        <IconButton onClick={onOpenFriends} label="Friends">
          <Users size={20} />
        </IconButton>
        <IconButton onClick={onOpenSettings} label="Settings">
          <Settings size={20} />
        </IconButton>
        <div className="ml-1">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { userButtonAvatarBox: { width: '2.5rem', height: '2.5rem' } },
            }}
          />
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface border border-border text-text shadow-(--shadow-sm) hover:bg-surface-2 hover:shadow-(--shadow-md) active:scale-[0.97] transition-[background-color,box-shadow,transform] duration-150 ease-out"
    >
      {children}
    </button>
  );
}
