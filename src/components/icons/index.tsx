// Gellog Icon System
// Standard icons: re-exported from lucide-react with Gellog naming
// Custom icons: inline SVG for Gellog-specific concepts

import {
  Bell,
  Bookmark,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Heart,
  Home,
  MessageCircle,
  Navigation2,
  Plus,
  Rss,
  Search,
  Settings,
  Share2,
  Star,
  Store,
  TrendingUp,
  Trophy,
  Upload,
  User,
  UserPlus,
  X,
  type LucideProps,
} from "lucide-react";
import type { FC, SVGProps } from "react";

// ─── Standard icon aliases ─────────────────────────────────────────────────────

export const GellogLog = Plus;
export const GellogFeed = Rss;
export const GellogSearch = Search;
export const GellogHome = Home;
export const GellogProfile = User;
export const GellogSettings = Settings;
export const GellogShare = Upload;
export const GellogLike = Heart;
export const GellogComment = MessageCircle;
export const GellogFollow = UserPlus;
export const GellogSalon = Store;
export const GellogWeather = Cloud;
export const GellogStar = Star;
export const GellogPhoto = Camera;
export const GellogBack = ChevronLeft;
export const GellogClose = X;
export const GellogRight = ChevronRight;
export const GellogCheck = Check;
export const GellogTrophy = Trophy;
export const GellogCalendar = Calendar;
export const GellogBookmark = Bookmark;
export const GellogData = TrendingUp;
export const GellogNotification = Bell;
export const GellogDirections = Navigation2;

// ─── Custom SVG icons ─────────────────────────────────────────────────────────

// GellogFlavour: a scoop shape — stroke-only circle with a small curved
// wafer/cone line at the bottom
export function GellogFlavour({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.5,
  ...rest
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {/* Scoop circle */}
      <circle cx="12" cy="9" r="6" />
      {/* Wafer/cone connection — a small curved line at the bottom */}
      <path d="M9 15 Q12 18 15 15" />
    </svg>
  );
}

// GellogGellog: a stylised "G" wordmark letterform in the Gellog brand style
export function GellogGellog({
  size = 24,
  color = "var(--color-orange)",
  ...rest
}: {
  size?: number;
  color?: string;
} & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...rest}
    >
      <text
        x="12"
        y="18"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill={color}
      >
        G
      </text>
    </svg>
  );
}

// ─── Icon registry ─────────────────────────────────────────────────────────────

type StandardIconComponent = FC<LucideProps>;
type CustomIconComponent = FC<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const ICON_MAP: Record<string, StandardIconComponent | CustomIconComponent> = {
  GellogLog,
  GellogFeed,
  GellogSearch,
  GellogHome,
  GellogProfile,
  GellogSettings,
  GellogShare,
  GellogLike,
  GellogComment,
  GellogFollow,
  GellogSalon,
  GellogWeather,
  GellogStar,
  GellogPhoto,
  GellogBack,
  GellogClose,
  GellogRight,
  GellogCheck,
  GellogTrophy,
  GellogCalendar,
  GellogBookmark,
  GellogData,
  GellogNotification,
  GellogDirections,
  GellogFlavour,
  GellogGellog,
};

export type IconName = keyof typeof ICON_MAP;

// ─── Icon component ───────────────────────────────────────────────────────────

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.5 }: IconProps) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component size={size} color={color} strokeWidth={strokeWidth} />;
}

// ─── IconButton component ─────────────────────────────────────────────────────

type IconButtonProps = {
  name: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
};

export function IconButton({
  name,
  onPress,
  color = "currentColor",
  size = 24,
  label,
  strokeWidth = 1.5,
  style,
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        borderRadius: "50%",
        color,
        ...style,
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
      }}
      onTouchStart={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
      }}
      onTouchEnd={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
      }}
    >
      <Icon name={name} size={size} color={color} strokeWidth={strokeWidth} />
    </button>
  );
}
