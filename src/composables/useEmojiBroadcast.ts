import { computed, ref, type Ref } from 'vue'

export function useEmojiBroadcast(_opts: {
  room: Ref<unknown>
  myUid: Ref<string | null>
  roomId: Ref<string>
}) {
  return {
    activeBubble: ref<Record<string, { value: string; key: number } | undefined>>({}),
    clearBubble: (_uid: string) => {},
    sendEmoji: async (_value: string) => {},
    cooldownRemainingMs: computed(() => 0),
  }
}
