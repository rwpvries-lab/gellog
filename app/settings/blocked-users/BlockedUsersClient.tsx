"use client";

import { createClient } from "@/src/lib/supabase/client";
import { Toast, useToast } from "@/src/components/Toast";
import Image from "next/image";
import { useState } from "react";

export type BlockedUser = {
  /** `blocked_users` row id — used for the delete. */
  id: string;
  blockedId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

const CARD: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  overflow: "hidden",
};

const ROW: React.CSSProperties = {
  minHeight: 60,
  padding: "10px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

function Sep() {
  return (
    <div
      style={{
        height: "0.5px",
        background: "var(--color-border)",
        marginLeft: 64,
      }}
    />
  );
}

function UserLabel({
  username,
  displayName,
}: {
  username: string | null;
  displayName: string | null;
}) {
  const name = displayName?.trim();
  const handle = username?.trim();
  if (name && handle) {
    return (
      <div className="min-w-0">
        <span
          style={{
            color: "var(--color-text-primary)",
            fontSize: 15,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {name}
        </span>
        <span
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          @{handle}
        </span>
      </div>
    );
  }
  return (
    <span
      style={{
        color: "var(--color-text-primary)",
        fontSize: 15,
        fontWeight: 500,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {name ?? (handle ? `@${handle}` : "Unknown user")}
    </span>
  );
}

function Avatar({
  username,
  avatarUrl,
}: {
  username: string | null;
  avatarUrl: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = (username ?? "?").charAt(0).toUpperCase();
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-full bg-[color:var(--color-teal)]"
      style={{ width: 40, height: 40 }}
    >
      {avatarUrl && !imgError ? (
        <Image
          src={avatarUrl}
          alt={username ?? "Blocked user"}
          width={40}
          height={40}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[color:var(--color-on-brand)]">
          {initial}
        </span>
      )}
    </div>
  );
}

/**
 * Blocked-users list with optimistic unblock. RLS (`blocked_users_delete_own`,
 * `auth.uid() = blocker_id`) guards the delete, so removing by row id is safe.
 * On failure we restore the row and surface a toast.
 */
export function BlockedUsersClient({
  initialBlocked,
}: {
  initialBlocked: BlockedUser[];
}) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  async function handleUnblock(user: BlockedUser) {
    if (pendingId) return;
    setPendingId(user.id);

    // Optimistic: drop the row immediately, remember its index to restore on error.
    const index = blocked.findIndex((b) => b.id === user.id);
    setBlocked((prev) => prev.filter((b) => b.id !== user.id));

    const supabase = createClient();
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("id", user.id);

    setPendingId(null);

    if (error) {
      setBlocked((prev) => {
        const next = [...prev];
        next.splice(index < 0 ? prev.length : index, 0, user);
        return next;
      });
      showToast("Couldn't unblock. Please try again.");
    }
  }

  if (blocked.length === 0) {
    return (
      <div
        style={{
          ...CARD,
          padding: "32px 20px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "var(--color-text-primary)",
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          No blocked users
        </p>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          People you block won&apos;t appear in your feed. You can unblock them
          here any time.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={CARD}>
        {blocked.map((user, i) => (
          <div key={user.id}>
            {i > 0 && <Sep />}
            <div style={ROW}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar username={user.username} avatarUrl={user.avatarUrl} />
                <UserLabel
                  username={user.username}
                  displayName={user.displayName}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleUnblock(user)}
                disabled={pendingId === user.id}
                style={{
                  flexShrink: 0,
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: pendingId === user.id ? "not-allowed" : "pointer",
                  opacity: pendingId === user.id ? 0.6 : 1,
                }}
              >
                {pendingId === user.id ? "Unblocking…" : "Unblock"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast ? (
        <Toast key={toast.id} message={toast.message} onDismiss={dismissToast} />
      ) : null}
    </>
  );
}
