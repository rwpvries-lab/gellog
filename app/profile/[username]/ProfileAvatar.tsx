'use client';

import Image from "next/image";
import { useState } from "react";

export function ProfileAvatar({ avatarUrl, displayName, initial }: { avatarUrl: string | null; displayName: string; initial: string }) {
  const [imgError, setImgError] = useState(false);
  return avatarUrl && !imgError ? (
    <Image
      src={avatarUrl}
      alt={displayName}
      fill
      className="object-cover"
      unoptimized
      onError={() => setImgError(true)}
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-xl font-semibold">
      {initial}
    </span>
  );
}
