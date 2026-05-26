/** Progress orchestration — coordinator + productivity contract re-exports. */
export * from "./productivityContract.js";
export {
  handleProgressEvent,
  dispatchProgressEvent,
} from "./coordinator.js";
export {
  PROGRESS_EVENT_TYPES,
  createFocusSessionCompletedEvent,
  createTaskCompletedEvent,
} from "./events.js";
export { progressFacadeRoutes } from "./facade/index.js";
