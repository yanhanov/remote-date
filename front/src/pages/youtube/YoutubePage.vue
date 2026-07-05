<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { PhArrowRight, PhSpinner, PhSignIn, PhPlus } from "@phosphor-icons/vue";
import { LastRoomCard, useLastRoom } from "@/entities/room";
import { roomAPI } from "@/shared/api/room.api";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import YouTubeIcon from "@/shared/ui/icons/YouTubeIcon.vue";

const router = useRouter();
const roomIdToJoin = ref("");
const createLoading = ref(false);
const joinLoading = ref(false);
const createError = ref<string | null>(null);
const joinError = ref<string | null>(null);

const { lastRoom, loading: lastRoomLoading } = useLastRoom("youtube");

async function createRoom() {
  createLoading.value = true;
  createError.value = null;

  try {
    const room = await roomAPI.createRoom({ type: "youtube" });
    router.push(`/room/${room.id}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create room";
    createError.value = message;
    toast.error(message);
  } finally {
    createLoading.value = false;
  }
}

async function joinRoom() {
  const id = roomIdToJoin.value.trim();
  if (!id) {
    joinError.value = "Please enter a room ID";
    toast.error("Please enter a room ID");
    return;
  }

  joinLoading.value = true;
  joinError.value = null;

  try {
    const room = await roomAPI.getRoom(id);
    if (room.type !== "youtube") {
      joinError.value = "This is not a YouTube room";
      toast.error("This is not a YouTube room");
      return;
    }
    router.push(`/room/${id}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Room not found";
    joinError.value = message;
    toast.error(message);
  } finally {
    joinLoading.value = false;
  }
}
</script>

<template>
  <div
    class="youtube-page flex flex-1 flex-col items-center justify-center p-6"
  >
    <div class="youtube-page__container w-full max-w-sm space-y-8">
      <header class="youtube-page__header space-y-1.5 text-center">
        <div
          class="youtube-page__brand flex items-center justify-center gap-2.5"
        >
          <span
            class="youtube-page__icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50"
          >
            <YouTubeIcon class="youtube-page__icon-svg size-5 opacity-90" />
          </span>
          <h1 class="youtube-page__title text-2xl font-semibold tracking-tight">
            YouTube
          </h1>
        </div>
        <p class="youtube-page__subtitle text-sm text-muted-foreground">
          Create a room or join by ID.
        </p>
      </header>

      <div class="youtube-page__actions space-y-2">
        <LastRoomCard
          v-if="lastRoom && !lastRoomLoading"
          class="youtube-page__last-room"
          :room="lastRoom"
          room-type="youtube"
        />

        <button
          type="button"
          class="youtube-page__create group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-border hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-60"
          :disabled="createLoading"
          @click="createRoom"
        >
          <span
            class="youtube-page__create-icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50"
          >
            <PhSpinner
              v-if="createLoading"
              class="youtube-page__create-spinner size-4 animate-spin text-muted-foreground"
            />
            <PhPlus
              v-else
              class="youtube-page__create-plus size-4 text-muted-foreground"
            />
          </span>

          <span class="youtube-page__create-body min-w-0 flex-1">
            <span class="youtube-page__create-title block text-sm font-medium">
              {{ createLoading ? "Creating..." : "Create room" }}
            </span>
            <span
              class="youtube-page__create-description mt-0.5 block text-xs text-muted-foreground"
            >
              Pick a video inside the room
            </span>
          </span>

          <PhArrowRight
            class="youtube-page__create-arrow size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        </button>

        <section
          class="youtube-page__join rounded-xl border border-border/60 bg-card/40 p-4 space-y-3"
        >
          <div class="youtube-page__join-header flex items-center gap-2">
            <PhSignIn
              class="youtube-page__join-icon size-4 text-muted-foreground"
            />
            <h2 class="youtube-page__join-title text-sm font-medium">
              Join room
            </h2>
          </div>

          <Input
            id="room-id"
            v-model="roomIdToJoin"
            class="youtube-page__join-input h-10 border-border/60 bg-background/60 shadow-none"
            type="text"
            placeholder="Room ID"
            @keyup.enter="joinRoom"
          />

          <p
            v-if="joinError"
            class="youtube-page__error text-xs text-destructive"
          >
            {{ joinError }}
          </p>
          <p
            v-else-if="createError"
            class="youtube-page__error text-xs text-destructive"
          >
            {{ createError }}
          </p>

          <Button
            class="youtube-page__join-submit h-9 w-full"
            variant="secondary"
            :disabled="joinLoading"
            @click="joinRoom"
          >
            {{ joinLoading ? "Joining..." : "Join room" }}
          </Button>
        </section>
      </div>
    </div>
  </div>
</template>
