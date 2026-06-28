<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref, computed } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/shared/lib/utils'
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
  type?: string
  variant?: string
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.variant === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type || 'text'
})

const isPasswordVariant = computed(() => props.variant === 'password')

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="relative w-full">
    <input
      v-bind="$attrs"
      v-model="modelValue"
      :type="inputType"
      data-slot="input"
      :class="
        cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          isPasswordVariant ? 'pr-10 pl-3' : 'px-3',
          !isPasswordVariant && 'px-3',
          props.class
        )
      " />
    <button
      v-if="isPasswordVariant"
      type="button"
      @click="togglePasswordVisibility"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
      tabindex="-1">
      <PhEye v-if="!showPassword" class="h-4 w-4" />
      <PhEyeSlash v-else class="h-4 w-4" />
    </button>
  </div>
</template>
