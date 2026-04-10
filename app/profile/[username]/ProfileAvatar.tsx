'use client';

import Image from "next/image";
import { useState } from "react";

export function ProfileAvatar({ avatarUrl, displayName, initial }: { avatarUrl: string | null; displayName: string; initial: string }) {
  const [imgError, setImgError] = useState(false);
  return avatarUrl && !imgError ? (
    <Image
      src={avatarUrl}
      alt={displayName}
      width={40}
      height={40}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center bg-[color:var(--color-teal)] text-xl font-semibold text-[color:var(--color-on-brand)]">
      {initial}
    </span>
  );
}
