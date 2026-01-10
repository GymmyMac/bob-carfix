/**
 * Type declarations for @bob-widget path alias
 * Maps to packages/bob-widget/src/ during development
 */
declare module "@bob-widget/components/mobile/MobileBobLayout" {
  import { MobileBobLayout as _MobileBobLayout } from "../packages/bob-widget/src/components/mobile/MobileBobLayout";
  export const MobileBobLayout: typeof _MobileBobLayout;
}

declare module "@bob-widget/components/SwipeableBob" {
  import { SwipeableBob as _SwipeableBob } from "../packages/bob-widget/src/components/SwipeableBob";
  export const SwipeableBob: typeof _SwipeableBob;
}

declare module "@bob-widget/components/MatrixProductLoader" {
  import { MatrixProductLoader as _MatrixProductLoader, LoaderPhase as _LoaderPhase } from "../packages/bob-widget/src/components/MatrixProductLoader";
  export const MatrixProductLoader: typeof _MatrixProductLoader;
  export type LoaderPhase = _LoaderPhase;
}
