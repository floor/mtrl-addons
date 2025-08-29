export {
  withGestures
} from './features/gestures';

// Gesture features
export { withTapGesture } from './features/gestures/tap';
export { withSwipeGesture } from './features/gestures/swipe';
export { withLongPressGesture } from './features/gestures/longpress';
export { withPanGesture } from './features/gestures/pan';


export type {
  GesturesComponent,
  GesturesFeatureConfig
} from './features';