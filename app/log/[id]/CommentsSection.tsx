'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type LogComment = {
  id: string;
  log_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
};

export function avatarColour(username: string | null | undefined): string {
  const i = !username ? 0 : username.charCodeAt(0) % 5;
  return `var(--color-avatar-${i})`;
}

export function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

export function Avatar({
  username,
  avatarUrl,
  size = 40,
}: {
  username?: string | null;
  avatarUrl?: string | null;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  return avatarUrl && !imgError ? (
    <Image
      src={avatarUrl}
      alt={username ?? ""}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setImgError(true)}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[color:var(--color-teal)] font-semibold text-[color:var(--color-on-brand)]"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {(username ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

type CommentItemProps = {
  comment: LogComment;
  replies: LogComment[];
  currentUserId?: string;
  onReply: (username: string) => void;
  onEdit: (id: string, newContent: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function CommentItem({
  comment,
  replies,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(replies.length <= 2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwn = comment.user_id === currentUserId;
  const username = comment.profiles?.username ?? "Unknown";

  return (
    <div className="flex gap-2.5">
      <Link href={`/profile/${username}`} className="shrink-0">
        <Avatar username={username} avatarUrl={comment.profiles?.avatar_url} size={40} />
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${username}`}
            className="text-xs font-semibold text-[color:var(--color-text-primary)]"
          >
            {username}
          </Link>
          <span className="text-[10px] text-[color:var(--color-text-tertiary)]">{timeAgo(comment.created_at)}</span>

          {isOwn && (
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowMenu((s) => !s)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-text-tertiary)] hover:bg-[color:var(--color-surface-alt)]"
                aria-label="Comment options"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-6 z-10 w-28 rounded-2xl bg-[color:var(--color-surface)] py-1 shadow-[var(--shadow-card-sm)] ring-1 ring-[color:var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditContent(comment.content);
                      setEditingId(comment.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-alt)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-[color:var(--color-error)] hover:bg-[color:var(--color-error-surface)]"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {editingId === comment.id ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
              autoFocus
              rows={2}
              className="w-full resize-none rounded-2xl bg-[color:var(--color-surface-alt)] px-3 py-2 text-sm text-[color:var(--color-text-primary)] ring-1 ring-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-orange)_40%,var(--color-teal))]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-full bg-[color:var(--color-surface-alt)] px-3 py-1 text-xs font-medium text-[color:var(--color-text-primary)] ring-1 ring-[color:var(--color-border)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!editContent.trim()}
                onClick={async () => {
                  await onEdit(comment.id, editContent.trim());
                  setEditingId(null);
                }}
                className="rounded-full bg-[color:var(--color-orange)] px-3 py-1 text-xs font-semibold text-[color:var(--color-on-brand)] disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--color-text-primary)]">{comment.content}</p>
        )}

        {editingId !== comment.id && currentUserId && (
          <button
            type="button"
            onClick={() => onReply(username)}
            className="self-start text-[10px] font-medium text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]"
          >
            Reply
          </button>
        )}

        {showDeleteConfirm && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 px-3 py-2 dark:bg-red-950/30">
            <p className="flex-1 text-xs text-red-700 dark:text-red-300">Delete this comment?</p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs text-[color:var(--color-text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await onDelete(comment.id);
                setShowDeleteConfirm(false);
              }}
              className="text-xs font-semibold text-red-600"
            >
              Delete
            </button>
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-3 border-l-2 border-[color:var(--color-border)] pl-3">
            {replies.length > 2 && (
              <button
                type="button"
                onClick={() => setShowReplies((s) => !s)}
                className="self-start text-[10px] font-medium text-[color:var(--color-teal)]"
              >
                {showReplies ? "Hide replies" : `Show replies (${replies.length})`}
              </button>
            )}
            {showReplies &&
              replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  replies={[]}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

type Props = {
  comments: LogComment[];
  currentUserId?: string;
  onReply: (username: string) => void;
  onEdit: (id: string, newContent: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function CommentsSection({ comments, currentUserId, onReply, onEdit, onDelete }: Props) {
  const topLevel = comments.filter((c) => c.parent_id === null);
  const repliesMap = new Map<string, LogComment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const arr = repliesMap.get(c.parent_id) ?? [];
      arr.push(c);
      repliesMap.set(c.parent_id, arr);
    }
  }

  const count = comments.length;
  const heading =
    count === 0 ? "No comments yet" : count === 1 ? "1 comment" : `${count} comments`;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h2 className="text-sm font-semibold text-[color:var(--color-text-primary)]">{heading}</h2>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-[color:var(--color-surface)] px-6 py-10 text-center ring-1 ring-[color:var(--color-border)]">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[color:var(--color-text-tertiary)]"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm font-medium text-[color:var(--color-text-secondary)]">
            Be the first to comment
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={repliesMap.get(comment.id) ?? []}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
