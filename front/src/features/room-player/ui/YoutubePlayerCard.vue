<script setup lang="ts">
import { PhArrowsIn, PhArrowsOut } from "@phosphor-icons/vue";
import { Button } from "@/shared/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { YOUTUBE_PLAYER_ELEMENT_ID } from "../model/youtube.types";

defineProps<{
  roomId: string;
  participants: number;
  hasVideo?: boolean;
  error?: string | null;
  theater?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle-theater"): void;
}>();
</script>

<template>
  <section
    class="youtube-player-card flex min-h-0 flex-1 flex-col overflow-hidden"
    :class="
      theater
        ? 'youtube-player-card--theater bg-black'
        : 'rounded-xl border border-border/60 bg-card/40'
    "
  >
    <header
      v-if="!theater"
      class="youtube-player-card__header flex shrink-0 items-center justify-between border-b border-border/40 px-4 py-3"
    >
      <div class="youtube-player-card__meta flex min-w-0 items-center gap-3">
        <span
          class="youtube-player-card__room-id text-xs font-medium text-muted-foreground"
        >
          Room {{ roomId.slice(0, 8) }}
        </span>
        <span
          class="youtube-player-card__participants text-xs text-muted-foreground"
        >
          {{ participants }} online
        </span>
      </div>

      <TooltipProvider v-if="hasVideo" :delay-duration="200">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              class="youtube-player-card__theater-toggle size-8 shrink-0 text-muted-foreground"
              :aria-label="theater ? 'Exit fullscreen' : 'Open fullscreen'"
              @click="emit('toggle-theater')"
            >
              <PhArrowsIn v-if="theater" class="size-4" />
              <PhArrowsOut v-else class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {{ theater ? "Exit fullscreen (Esc)" : "Fullscreen with chat" }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>

    <div
      class="youtube-player-card__content flex min-h-0 flex-1 flex-col"
      :class="theater ? 'p-0' : 'p-3'"
    >
      <div
        class="youtube-player-card__viewport relative min-h-[180px] flex-1 overflow-hidden bg-black"
        :class="theater ? 'rounded-none' : 'rounded-lg'"
      >
        <div
          v-if="!hasVideo"
          class="youtube-player-card__placeholder absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/60"
        >
          Search for a video or paste a link to start watching.
        </div>
        <div
          :id="YOUTUBE_PLAYER_ELEMENT_ID"
          class="youtube-player-card__target absolute inset-0"
        />
      </div>

      <p
        v-if="error"
        class="youtube-player-card__error mt-2 shrink-0 text-xs text-destructive"
      >
        {{ error }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.youtube-player-card__target :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
