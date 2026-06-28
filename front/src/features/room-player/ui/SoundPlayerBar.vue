<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/shared/ui/button";
import { Slider } from "@/shared/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  GripVertical,
} from "lucide-vue-next";
import DropdownMenu from "@/shared/ui/dropdown-menu/DropdownMenu.vue";
import DropdownMenuTrigger from "@/shared/ui/dropdown-menu/DropdownMenuTrigger.vue";
import DropdownMenuContent from "@/shared/ui/dropdown-menu/DropdownMenuContent.vue";
import DropdownMenuItem from "@/shared/ui/dropdown-menu/DropdownMenuItem.vue";

const props = defineProps({
  title: {
    type: String,
    default: "No track selected",
  },
  artist: {
    type: String,
    default: "",
  },
  artworkUrl: {
    type: String,
    default: "",
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  currentTime: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  canPlay: {
    type: Boolean,
    default: false,
  },
  volume: {
    type: Number,
    default: 100, // 0–100
  },
  muted: {
    type: Boolean,
    default: false,
  },
  queue: {
    type: Array as () => {
      id: string | number;
      title?: string | null;
      artist?: string | null;
    }[],
    default: () => [],
  },
  currentQueueIndex: {
    type: Number,
    default: -1,
  },
  canGoPrev: {
    type: Boolean,
    default: false,
  },
  canGoNext: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: "togglePlay"): void;
  (e: "seek", value: number): void;
  (e: "toggleMute"): void;
  (e: "changeVolume", value: number): void;
  (e: "prev"): void;
  (e: "next"): void;
  (e: "like"): void;
  (e: "selectQueueIndex", index: number): void;
  (e: "reorderQueue", newOrderIds: (string | number)[]): void;
}>();

const draggedIndex = ref<number | null>(null);

function onDragStart(e: DragEvent, index: number) {
  draggedIndex.value = index;
  e.dataTransfer?.setData("text/plain", String(index));
  e.dataTransfer!.effectAllowed = "move";
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = "move";
}

function onDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault();
  const from = draggedIndex.value;
  if (from === null || from === dropIndex) {
    draggedIndex.value = null;
    return;
  }
  const ids = [...props.queue]
    .map((t) => t.id)
    .filter((id): id is string | number => id != null);
  const [removed] = ids.splice(from, 1);
  if (removed === undefined) {
    draggedIndex.value = null;
    return;
  }
  ids.splice(dropIndex, 0, removed);
  draggedIndex.value = null;
  emit("reorderQueue", ids);
}

function onDragEnd() {
  draggedIndex.value = null;
}

const formattedTime = computed(() => {
  const mins = Math.floor(props.currentTime / 60);
  const secs = Math.floor(props.currentTime % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
});

const formattedDuration = computed(() => {
  const mins = Math.floor(props.duration / 60);
  const secs = Math.floor(props.duration % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
});

const progressValue = computed(() =>
  props.duration ? (props.currentTime / props.duration) * 100 : 0,
);

const handleSeek = (values?: number[]) => {
  const value = values?.[0] ?? 0;
  emit("seek", value);
};

const handleVolumeChange = (values?: number[]) => {
  const value = values?.[0] ?? 0;
  emit("changeVolume", value);
};
</script>

<template>
  <section
    class="sound-player-bar fixed inset-x-0 bottom-0 z-50 w-full border-t border-border/60 bg-background/95 py-2 backdrop-blur-sm"
  >
    <div
      class="flex flex-col gap-2 px-3 sm:px-4 sm:flex-row sm:items-center sm:gap-4 py-0!"
    >
      <!-- Artwork -->
      <div
        class="h-10 w-10 md:flex hidden sm:h-12 sm:w-12 rounded-md bg-muted overflow-hidden shrink-0 items-center justify-center"
      >
        <img
          v-if="artworkUrl"
          :src="artworkUrl"
          alt=""
          class="h-full w-full object-cover"
        />
        <span v-else class="text-xs text-muted-foreground">SC</span>
      </div>

      <!-- Title / artist + progress -->
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <div
          class="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground"
        >
          <div class="truncate">
            <span
              class="text-sm sm:text-base font-medium text-foreground truncate max-w-[140px] sm:max-w-[220px]"
            >
              {{ title }}
            </span>
            <span
              v-if="artist"
              class="ml-1 text-[11px] sm:text-xs text-muted-foreground truncate"
            >
              · {{ artist }}
            </span>
          </div>
          <span class="whitespace-nowrap hidden sm:inline">
            {{ formattedTime }} / {{ formattedDuration }}
          </span>
        </div>

        <Slider
          :model-value="[progressValue]"
          :min="0"
          :max="100"
          :step="1"
          class="w-full"
          @update:model-value="handleSeek"
        />
      </div>

      <!-- Controls -->
      <div
        class="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 mt-1 sm:mt-0"
      >
        <!-- Prev -->
        <Button
          size="icon"
          variant="ghost"
          class="text-muted-foreground hover:text-foreground"
          :disabled="!canGoPrev"
          @click="emit('prev')"
        >
          <SkipBack class="w-4 h-4" />
        </Button>

        <!-- Play / Pause -->
        <Button
          size="icon"
          variant="ghost"
          class="rounded-full border border-border/60 bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-white/70 hover:text-primary-foreground"
          :disabled="!canPlay"
          @click="emit('togglePlay')"
        >
          <span v-if="!isPlaying"><Play class="w-4 h-4" /></span>
          <span v-else><Pause class="size-4" /></span>
        </Button>

        <!-- Next -->
        <Button
          size="icon"
          variant="ghost"
          class="text-muted-foreground hover:text-foreground"
          :disabled="!canGoNext"
          @click="emit('next')"
        >
          <SkipForward class="w-4 h-4" />
        </Button>

        <!-- Queue dropdown -->
        <DropdownMenu v-if="queue.length">
          <template #default>
            <DropdownMenuTrigger as-child>
              <Button
                size="icon"
                variant="ghost"
                class="text-muted-foreground hover:text-foreground"
              >
                <ListMusic class="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              class="w-72 max-h-[min(70vh,400px)] overflow-y-auto"
            >
              <div
                class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
              >
                Queue
              </div>
              <DropdownMenuItem
                v-for="(track, index) in queue"
                :key="track.id ?? index"
                :class="[
                  'flex flex-col items-start gap-0.5 group',
                  index === currentQueueIndex
                    ? 'bg-accent text-accent-foreground'
                    : '',
                ]"
                draggable="true"
                @click="emit('selectQueueIndex', index)"
                @dragstart="onDragStart($event, index)"
                @dragover="onDragOver"
                @drop="onDrop($event, index)"
                @dragend="onDragEnd"
              >
                <div class="flex items-center gap-2 w-full min-w-0">
                  <span
                    class="shrink-0 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                    @mousedown.stop
                    @click.stop
                  >
                    <GripVertical class="size-3.5" />
                  </span>
                  <div class="flex-1 min-w-0 flex flex-col items-start gap-0.5">
                    <span class="text-xs font-medium truncate w-full">
                      {{ track.title || "Untitled track" }}
                    </span>
                    <span
                      v-if="track.artist"
                      class="text-[10px] text-muted-foreground truncate w-full"
                    >
                      {{ track.artist }}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </template>
        </DropdownMenu>

        <!-- Volume -->
        <div class="hidden sm:flex items-center gap-2 w-24 md:w-32">
          <Button
            size="icon"
            variant="ghost"
            class="text-muted-foreground hover:text-foreground"
            @click="emit('toggleMute')"
          >
            <VolumeX v-if="muted || volume === 0" class="w-4 h-4" />
            <Volume2 v-else class="w-4 h-4" />
          </Button>
          <Slider
            :model-value="[muted ? 0 : volume]"
            :min="0"
            :max="100"
            :step="1"
            class="w-full"
            @update:model-value="handleVolumeChange"
          />
        </div>
      </div>
    </div>
  </section>
</template>
