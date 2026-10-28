import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Button } from './ui/button.tsx';
import { cn } from '../lib/utils.ts';

interface NotificationItem {
  _id: string;
  type: string;
  refId?: string;
  read: boolean;
  createdAt: string;
}

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data.notifications,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => (await api.patch('/notifications/read-all')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4 stroke-[1.5]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-card p-3 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="font-mono text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3 w-3 stroke-[1.5]" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-border/50">
            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={cn(
                    'p-2 rounded-md transition-colors flex items-start justify-between gap-2 text-xs',
                    n.read ? 'opacity-60 hover:opacity-100' : 'bg-muted/30 font-medium',
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-foreground leading-snug">
                      {n.type === 'mention' ? 'You were mentioned in a comment' : `Notification: ${n.type}`}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead.mutate(n._id)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3 stroke-[1.5]" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
