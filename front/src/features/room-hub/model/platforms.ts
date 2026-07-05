import type { Component } from "vue";
import type { RoomType } from "@/shared/api/room.types";
import YouTubeIcon from "@/shared/ui/icons/YouTubeIcon.vue";
import SoundCloudIcon from "@/shared/ui/icons/SoundCloudIcon.vue";

export type PlatformId = "youtube" | "soundcloud";

export type PlatformConfig = {
  id: PlatformId;
  roomType: RoomType;
  title: string;
  tagline: string;
  description: string;
  createDescription: string;
  icon: Component;
  iconBg: string;
  iconRing: string;
  brandButton: string;
  brandButtonShadow: string;
  brandJoinButton: string;
  roomPath: (id: string) => string;
};

export const platforms: Record<PlatformId, PlatformConfig> = {
  youtube: {
    id: "youtube",
    roomType: "youtube",
    title: "YouTube",
    tagline: "Video rooms",
    description: "Create a room or join by ID.",
    createDescription: "Pick a video inside the room",
    icon: YouTubeIcon,
    iconBg: "bg-[var(--youtube)]/2",
    iconRing: "ring-[var(--youtube)]/20",
    brandButton: "bg-[var(--youtube)] hover:bg-[var(--youtube)]/90 text-white",
    brandButtonShadow: "shadow-[0_8px_24px_-6px_rgba(255,0,0,0.35)]",
    brandJoinButton:
      "border-[var(--youtube)]/35 text-[var(--youtube)] hover:bg-[var(--youtube)] hover:text-white hover:border-[var(--youtube)]",
    roomPath: (id) => `/room/${id}`,
  },
  soundcloud: {
    id: "soundcloud",
    roomType: "soundcloud",
    title: "SoundCloud",
    tagline: "Music rooms",
    description: "Create a room or join by ID.",
    createDescription: "Pick a track inside the room",
    icon: SoundCloudIcon,
    iconBg: "bg-[var(--soundcloud)]/2",
    iconRing: "ring-[var(--soundcloud)]/20",
    brandButton:
      "bg-[var(--soundcloud)] hover:bg-[var(--soundcloud)]/90 text-white",
    brandButtonShadow: "shadow-[0_8px_24px_-6px_rgba(255,85,0,0.35)]",
    brandJoinButton:
      "border-[var(--soundcloud)]/35 text-[var(--soundcloud)] hover:bg-[var(--soundcloud)] hover:text-white hover:border-[var(--soundcloud)]",
    roomPath: (id) => `/sound-room/${id}`,
  },
};
