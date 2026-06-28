<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { roomAPI } from "@/shared/api/room.api";
import SoundCloudIcon from "@/shared/ui/icons/SoundCloudIcon.vue";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

const router = useRouter();
const soundcloudUrl = ref("");
const roomIdToJoin = ref("");
const createLoading = ref(false);
const joinLoading = ref(false);
const createError = ref<string | null>(null);
const joinError = ref<string | null>(null);

async function createRoom(withUrl = false) {
  createLoading.value = true;
  createError.value = null;

  try {
    let room;
    if (withUrl && soundcloudUrl.value.trim()) {
      room = await roomAPI.createRoom({
        type: "soundcloud",
        soundcloudUrl: soundcloudUrl.value,
      });
    } else {
      room = await roomAPI.createRoom({ type: "soundcloud" });
    }
    router.push(`/sound-room/${room.id}`);
  } catch (err: unknown) {
    createError.value =
      err instanceof Error ? err.message : "Failed to create room";
  } finally {
    createLoading.value = false;
  }
}

async function joinRoom() {
  const id = roomIdToJoin.value.trim();
  if (!id) {
    joinError.value = "Please enter a room ID";
    return;
  }

  joinLoading.value = true;
  joinError.value = null;

  try {
    const room = await roomAPI.getRoom(id);
    if (room.type !== "soundcloud") {
      joinError.value = "This is not a SoundCloud room";
      return;
    }
    router.push(`/sound-room/${id}`);
  } catch (err: unknown) {
    joinError.value = err instanceof Error ? err.message : "Room not found";
  } finally {
    joinLoading.value = false;
  }
}
</script>

<template>
  <div
    class="soundcloud-page flex flex-1 flex-col items-center justify-center p-6"
  >
    <div class="soundcloud-page__container w-full max-w-md space-y-8">
      <header class="soundcloud-page__header space-y-1.5 text-center">
        <div
          class="soundcloud-page__brand flex items-center justify-center gap-2.5"
        >
          <span
            class="soundcloud-page__icon flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50"
          >
            <SoundCloudIcon
              class="soundcloud-page__icon-svg size-5 opacity-90"
            />
          </span>
          <h1
            class="soundcloud-page__title text-2xl font-semibold tracking-tight"
          >
            SoundCloud
          </h1>
        </div>
        <p class="soundcloud-page__subtitle text-sm text-muted-foreground">
          Create a room or join by ID. Add a track URL or pick one inside.
        </p>
      </header>

      <div class="soundcloud-page__sections space-y-3">
        <section
          class="soundcloud-page__panel soundcloud-page__panel--create rounded-xl border border-border/60 bg-card/40 p-5 space-y-4"
        >
          <div class="soundcloud-page__panel-header space-y-1">
            <h2 class="soundcloud-page__panel-title text-sm font-medium">
              Create room
            </h2>
            <p
              class="soundcloud-page__panel-description text-sm text-muted-foreground"
            >
              Start empty or with a track link.
            </p>
          </div>

          <div class="soundcloud-page__field space-y-2">
            <Label class="soundcloud-page__label sr-only" for="soundcloud-url">
              SoundCloud URL
            </Label>
            <Input
              id="soundcloud-url"
              v-model="soundcloudUrl"
              class="soundcloud-page__input"
              type="text"
              placeholder="https://soundcloud.com/... (optional)"
            />
            <p
              v-if="createError"
              class="soundcloud-page__error text-sm text-destructive"
            >
              {{ createError }}
            </p>
          </div>

          <div class="soundcloud-page__actions flex gap-2">
            <Button
              class="soundcloud-page__submit soundcloud-page__submit--empty flex-1"
              :disabled="createLoading"
              @click="createRoom(false)"
            >
              {{ createLoading ? "Creating..." : "Create room" }}
            </Button>
            <Button
              v-if="soundcloudUrl.trim()"
              class="soundcloud-page__submit soundcloud-page__submit--with-track flex-1"
              variant="secondary"
              :disabled="createLoading"
              @click="createRoom(true)"
            >
              With track
            </Button>
          </div>
        </section>

        <section
          class="soundcloud-page__panel soundcloud-page__panel--join rounded-xl border border-border/60 bg-card/40 p-5 space-y-4"
        >
          <div class="soundcloud-page__panel-header space-y-1">
            <h2 class="soundcloud-page__panel-title text-sm font-medium">
              Join room
            </h2>
            <p
              class="soundcloud-page__panel-description text-sm text-muted-foreground"
            >
              Enter a room ID shared by the host.
            </p>
          </div>

          <div class="soundcloud-page__field space-y-2">
            <Label class="soundcloud-page__label sr-only" for="room-id"
              >Room ID</Label
            >
            <Input
              id="room-id"
              v-model="roomIdToJoin"
              class="soundcloud-page__input"
              type="text"
              placeholder="Room ID"
              @keyup.enter="joinRoom"
            />
            <p
              v-if="joinError"
              class="soundcloud-page__error text-sm text-destructive"
            >
              {{ joinError }}
            </p>
          </div>

          <Button
            class="soundcloud-page__submit soundcloud-page__submit--join w-full"
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
