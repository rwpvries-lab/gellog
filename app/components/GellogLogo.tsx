import Image from "next/image";

type GellogLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function GellogLogo({ size = 96, className, priority }: GellogLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Gellog"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
