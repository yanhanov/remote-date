<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { useElementSize } from "@vueuse/core";
import { PhSpinner } from "@phosphor-icons/vue";
import {
  AVATAR_SOURCE_MAX_BYTES,
  AVATAR_STAGE_HEIGHT,
  clampCropBox,
  computeImageLayout,
  createInitialCropBox,
  getCropBoxStyle,
  getCropMaskStyles,
  getImageDisplayStyle,
  loadImageFromFile,
  renderAvatarWebpFromCropBox,
  resizeCropBoxFromHandle,
  type AvatarCropBox,
  type AvatarCropHandle,
  type AvatarImageLayout,
} from "@/shared/lib/avatar-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";

const props = defineProps<{
  open: boolean;
  file: File | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [dataUrl: string];
}>();

const stageRef = useTemplateRef<HTMLElement>("stage");
const { width: stageWidth, height: stageHeight } = useElementSize(stageRef);

const image = ref<HTMLImageElement | null>(null);
const layout = ref<AvatarImageLayout | null>(null);
const cropBox = ref<AvatarCropBox | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);

type DragState =
  | {
      mode: "move";
      startX: number;
      startY: number;
      cropX: number;
      cropY: number;
    }
  | {
      mode: "resize";
      handle: AvatarCropHandle;
      anchorX: number;
      anchorY: number;
    };

const dragState = ref<DragState | null>(null);

const effectiveStageWidth = computed(() => stageWidth.value || 320);
const effectiveStageHeight = computed(
  () => stageHeight.value || AVATAR_STAGE_HEIGHT,
);

const imageStyle = computed(() =>
  layout.value ? getImageDisplayStyle(layout.value) : null,
);

const cropStyle = computed(() =>
  cropBox.value ? getCropBoxStyle(cropBox.value) : null,
);

const maskStyles = computed(() => {
  if (!cropBox.value) return null;

  return getCropMaskStyles(
    cropBox.value,
    effectiveStageWidth.value,
    effectiveStageHeight.value,
  );
});

function resetCropState() {
  image.value = null;
  layout.value = null;
  cropBox.value = null;
  dragState.value = null;
}

function syncLayout() {
  if (
    !image.value ||
    effectiveStageWidth.value <= 0 ||
    effectiveStageHeight.value <= 0
  )
    return;

  const nextLayout = computeImageLayout(
    image.value.naturalWidth,
    image.value.naturalHeight,
    effectiveStageWidth.value,
    effectiveStageHeight.value,
  );

  layout.value = nextLayout;
  cropBox.value = createInitialCropBox(nextLayout);
}

function getStagePoint(event: PointerEvent) {
  const rect = stageRef.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

watch(
  () => [props.open, props.file] as const,
  async ([open, file]) => {
    if (!open || !file) {
      resetCropState();
      return;
    }

    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
      emit("update:open", false);
      return;
    }

    isLoading.value = true;

    try {
      image.value = await loadImageFromFile(file);
      syncLayout();
    } finally {
      isLoading.value = false;
    }
  },
);

watch([effectiveStageWidth, effectiveStageHeight, image], () => {
  if (image.value && props.open) syncLayout();
});

function closeDialog() {
  emit("update:open", false);
}

function onCropMoveStart(event: PointerEvent) {
  if (!cropBox.value || !layout.value || isSaving.value) return;

  event.stopPropagation();
  dragState.value = {
    mode: "move",
    startX: event.clientX,
    startY: event.clientY,
    cropX: cropBox.value.x,
    cropY: cropBox.value.y,
  };
  stageRef.value?.setPointerCapture(event.pointerId);
}

function onResizeStart(handle: AvatarCropHandle, event: PointerEvent) {
  if (!cropBox.value || !layout.value || isSaving.value) return;

  event.stopPropagation();
  const anchor = getResizeAnchor(handle, cropBox.value);
  dragState.value = {
    mode: "resize",
    handle,
    anchorX: anchor.x,
    anchorY: anchor.y,
  };
  stageRef.value?.setPointerCapture(event.pointerId);
}

function onStagePointerMove(event: PointerEvent) {
  if (!dragState.value || !layout.value) return;

  if (dragState.value.mode === "move") {
    const dx = event.clientX - dragState.value.startX;
    const dy = event.clientY - dragState.value.startY;

    cropBox.value = clampCropBox(
      {
        x: dragState.value.cropX + dx,
        y: dragState.value.cropY + dy,
        size: cropBox.value?.size ?? 0,
      },
      layout.value,
    );
    return;
  }

  const point = getStagePoint(event);
  cropBox.value = resizeCropBoxFromHandle(
    dragState.value.handle,
    point.x,
    point.y,
    dragState.value.anchorX,
    dragState.value.anchorY,
    layout.value,
  );
}

function onStagePointerUp(event: PointerEvent) {
  dragState.value = null;
  stageRef.value?.releasePointerCapture(event.pointerId);
}

function getResizeAnchor(handle: AvatarCropHandle, box: AvatarCropBox) {
  if (handle === "se") return { x: box.x, y: box.y };
  if (handle === "nw") return { x: box.x + box.size, y: box.y + box.size };
  if (handle === "ne") return { x: box.x, y: box.y + box.size };
  return { x: box.x + box.size, y: box.y };
}

async function onConfirm() {
  if (!image.value || !layout.value || !cropBox.value || isSaving.value) return;

  isSaving.value = true;

  try {
    const dataUrl = await renderAvatarWebpFromCropBox(
      image.value,
      layout.value,
      cropBox.value,
    );
    emit("confirm", dataUrl);
    emit("update:open", false);
  } finally {
    isSaving.value = false;
  }
}

const handles: AvatarCropHandle[] = ["nw", "ne", "sw", "se"];
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="avatar-crop-dialog w-[calc(100%-2rem)] max-w-sm gap-0 overflow-hidden p-0"
      :show-close-button="!isSaving"
    >
      <DialogHeader class="avatar-crop-dialog__header space-y-1 px-5 pt-5 pb-3">
        <DialogTitle class="avatar-crop-dialog__title">Crop photo</DialogTitle>
        <DialogDescription class="avatar-crop-dialog__description">
          Move and resize the square frame over your photo.
        </DialogDescription>
      </DialogHeader>

      <div class="avatar-crop-dialog__stage-wrap px-5">
        <div
          ref="stage"
          class="avatar-crop-dialog__stage relative w-full touch-none select-none overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/60"
          :style="{ height: `${AVATAR_STAGE_HEIGHT}px` }"
          @pointermove="onStagePointerMove"
          @pointerup="onStagePointerUp"
          @pointercancel="onStagePointerUp"
        >
          <div
            v-if="isLoading"
            class="avatar-crop-dialog__loading absolute inset-0 z-20 flex items-center justify-center"
          >
            <PhSpinner class="size-6 animate-spin text-muted-foreground" />
          </div>

          <template
            v-else-if="
              image &&
              layout &&
              cropBox &&
              imageStyle &&
              cropStyle &&
              maskStyles
            "
          >
            <img
              :src="image.src"
              alt=""
              draggable="false"
              class="avatar-crop-dialog__image absolute max-w-none"
              :style="imageStyle"
            />

            <div
              class="avatar-crop-dialog__mask pointer-events-none absolute inset-0 z-10"
            >
              <div
                class="avatar-crop-dialog__mask-part absolute inset-x-0 top-0 bg-background/55"
                :style="maskStyles.top"
              />
              <div
                class="avatar-crop-dialog__mask-part absolute inset-x-0 bg-background/55"
                :style="maskStyles.bottom"
              />
              <div
                class="avatar-crop-dialog__mask-part absolute left-0 bg-background/55"
                :style="maskStyles.left"
              />
              <div
                class="avatar-crop-dialog__mask-part absolute bg-background/55"
                :style="maskStyles.right"
              />
            </div>

            <div
              class="avatar-crop-dialog__crop-box absolute z-20 cursor-move rounded-sm border-2 border-primary shadow-sm"
              :class="{ 'cursor-grabbing': dragState?.mode === 'move' }"
              :style="cropStyle"
              @pointerdown="onCropMoveStart"
            >
              <div
                class="avatar-crop-dialog__grid pointer-events-none absolute inset-0"
              >
                <div class="absolute inset-x-0 top-1/3 h-px bg-primary/30" />
                <div class="absolute inset-x-0 top-2/3 h-px bg-primary/30" />
                <div class="absolute inset-y-0 left-1/3 w-px bg-primary/30" />
                <div class="absolute inset-y-0 left-2/3 w-px bg-primary/30" />
              </div>

              <div
                class="avatar-crop-dialog__circle-guide pointer-events-none absolute inset-2 rounded-full border border-primary/50"
              />

              <button
                v-for="handle in handles"
                :key="handle"
                type="button"
                class="avatar-crop-dialog__handle absolute size-3.5 rounded-full border-2 border-background bg-primary shadow-sm"
                :class="{
                  'avatar-crop-dialog__handle--nw -left-1.5 -top-1.5 cursor-nwse-resize':
                    handle === 'nw',
                  'avatar-crop-dialog__handle--ne -right-1.5 -top-1.5 cursor-nesw-resize':
                    handle === 'ne',
                  'avatar-crop-dialog__handle--sw -bottom-1.5 -left-1.5 cursor-nesw-resize':
                    handle === 'sw',
                  'avatar-crop-dialog__handle--se -bottom-1.5 -right-1.5 cursor-nwse-resize':
                    handle === 'se',
                }"
                :aria-label="`Resize ${handle}`"
                @pointerdown="onResizeStart(handle, $event)"
              />
            </div>
          </template>
        </div>
      </div>

      <DialogFooter
        class="avatar-crop-dialog__footer gap-2 border-t border-border/60 px-5 py-4 sm:gap-2"
      >
        <Button
          type="button"
          variant="outline"
          class="avatar-crop-dialog__cancel"
          :disabled="isSaving"
          @click="closeDialog"
        >
          Cancel
        </Button>
        <Button
          type="button"
          class="avatar-crop-dialog__save min-w-24"
          :disabled="!image || isLoading || isSaving"
          @click="onConfirm"
        >
          {{ isSaving ? "Saving…" : "Apply" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
