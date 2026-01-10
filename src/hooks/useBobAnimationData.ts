// Re-export from widget package for backwards compatibility
export { useBobAnimationData } from "../../packages/bob-widget/src/hooks/useBobAnimationData";
export type { BobAnimationData, AnimationStateDefinition, BobLook, BobAnimationConfig } from "../../packages/bob-widget/src/hooks/useBobAnimationData";

// Re-export invalidation hook - check if it exists in widget, otherwise stub
export { useInvalidateBobAnimationData } from "../../packages/bob-widget/src/hooks/useBobAnimationData";
