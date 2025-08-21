// src/components/user-avatar.tsx
import Image from "next/image";

export default function UserAvatar({
  name,
  url,
  size = 40,
}: { name?: string | null; url?: string | null; size?: number }) {
  if (url) {
    return (
      <Image
        alt={name || "avatar"}
        src={url}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  // fallback initials
  const initials = (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="rounded-full grid place-items-center bg-neutral-200 text-neutral-700 font-semibold"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
