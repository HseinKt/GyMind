import AsyncStorage from "@react-native-async-storage/async-storage";
import { Vibration } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WorkoutTimerMode = "timer" | "countdown" | "laps";
type ActiveWorkoutTimerMode = Exclude<WorkoutTimerMode, "laps">;

interface StartTimerOptions {
  countdownDurationMs?: number;
  activeDrillId?: string | null;
  activeWorkoutId?: string | null;
}

interface WorkoutTimerState {
  mode: WorkoutTimerMode;
  isRunning: boolean;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedElapsedMs: number;
  timerIsRunning: boolean;
  timerStartedAt: number | null;
  timerPausedAt: number | null;
  timerAccumulatedElapsedMs: number;
  countdownIsRunning: boolean;
  countdownStartedAt: number | null;
  countdownPausedAt: number | null;
  countdownAccumulatedElapsedMs: number;
  countdownDurationMs: number;
  countdownCompleted: boolean;
  laps: number[];
  activeDrillId: string | null;
  activeWorkoutId: string | null;
  completed: boolean;
  startTimer: (mode: WorkoutTimerMode, options?: StartTimerOptions) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  addLap: () => void;
  switchMode: (mode: WorkoutTimerMode) => void;
  setCountdownDuration: (durationMs: number) => void;
  getElapsedMs: () => number;
  getRemainingMs: () => number;
  syncCountdownCompletion: () => boolean;
}

const DEFAULT_COUNTDOWN_MS = 60_000;
const COUNTDOWN_FINISHED_VIBRATION = [0, 250, 150, 250, 150, 250];
let countdownCompletionTimeout: ReturnType<typeof setTimeout> | null = null;

function normalizeMode(mode: WorkoutTimerMode): ActiveWorkoutTimerMode {
  return mode === "laps" ? "timer" : mode;
}

function getRuntimeElapsed(accumulatedElapsedMs: number | null | undefined, isRunning: boolean | undefined, startedAt: number | null | undefined) {
  const safeAccumulatedElapsedMs = Number.isFinite(accumulatedElapsedMs) ? Number(accumulatedElapsedMs) : 0;
  if (!isRunning || startedAt == null) {
    return safeAccumulatedElapsedMs;
  }

  return Math.max(0, safeAccumulatedElapsedMs + Date.now() - startedAt);
}

function getTimerElapsedFromState(state: WorkoutTimerState) {
  return getRuntimeElapsed(state.timerAccumulatedElapsedMs, state.timerIsRunning, state.timerStartedAt);
}

function getCountdownElapsedFromState(state: WorkoutTimerState) {
  return getRuntimeElapsed(state.countdownAccumulatedElapsedMs, state.countdownIsRunning, state.countdownStartedAt);
}

function getActiveRuntimeState(state: WorkoutTimerState) {
  const mode = normalizeMode(state.mode);
  if (mode === "countdown") {
    return {
      isRunning: Boolean(state.countdownIsRunning),
      startedAt: state.countdownStartedAt,
      pausedAt: state.countdownPausedAt,
      accumulatedElapsedMs: getCountdownElapsedFromState(state),
      completed: state.countdownCompleted
    };
  }

  return {
    isRunning: Boolean(state.timerIsRunning),
    startedAt: state.timerStartedAt,
    pausedAt: state.timerPausedAt,
    accumulatedElapsedMs: getTimerElapsedFromState(state),
    completed: false
  };
}

function clearCountdownCompletionTimeout() {
  if (countdownCompletionTimeout !== null) {
    clearTimeout(countdownCompletionTimeout);
    countdownCompletionTimeout = null;
  }
}

function scheduleCountdownCompletion(state: WorkoutTimerState, complete: () => void) {
  clearCountdownCompletionTimeout();

  if (!state.countdownIsRunning) {
    return;
  }

  const durationMs = Number.isFinite(state.countdownDurationMs) ? state.countdownDurationMs : DEFAULT_COUNTDOWN_MS;
  const remainingMs = Math.max(0, durationMs - getCountdownElapsedFromState(state));
  if (remainingMs <= 0) {
    complete();
    return;
  }

  countdownCompletionTimeout = setTimeout(complete, remainingMs + 50);
}

export const useWorkoutTimerStore = create<WorkoutTimerState>()(
  persist(
    (set, get) => ({
      mode: "timer",
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      accumulatedElapsedMs: 0,
      timerIsRunning: false,
      timerStartedAt: null,
      timerPausedAt: null,
      timerAccumulatedElapsedMs: 0,
      countdownIsRunning: false,
      countdownStartedAt: null,
      countdownPausedAt: null,
      countdownAccumulatedElapsedMs: 0,
      countdownDurationMs: DEFAULT_COUNTDOWN_MS,
      countdownCompleted: false,
      laps: [],
      activeDrillId: null,
      activeWorkoutId: null,
      completed: false,
      startTimer: (mode, options) => {
        const now = Date.now();
        const durationMs = options?.countdownDurationMs;
        const targetMode = normalizeMode(mode);

        set((state) => {
          const nextState: WorkoutTimerState = {
            ...state,
            mode: targetMode,
            activeDrillId: options?.activeDrillId ?? state.activeDrillId,
            activeWorkoutId: options?.activeWorkoutId ?? state.activeWorkoutId
          };

          if (targetMode === "countdown") {
            const hasNewDuration = typeof durationMs === "number" && Number.isFinite(durationMs);
            nextState.countdownDurationMs = hasNewDuration ? Math.max(1000, durationMs) : state.countdownDurationMs ?? DEFAULT_COUNTDOWN_MS;
            nextState.countdownAccumulatedElapsedMs = hasNewDuration || state.countdownCompleted ? 0 : state.countdownAccumulatedElapsedMs;
            nextState.countdownIsRunning = true;
            nextState.countdownStartedAt = now;
            nextState.countdownPausedAt = null;
            nextState.countdownCompleted = false;
          } else {
            nextState.timerIsRunning = true;
            nextState.timerStartedAt = now;
            nextState.timerPausedAt = null;
          }

          const activeRuntime = getActiveRuntimeState(nextState);
          return {
            ...nextState,
            isRunning: activeRuntime.isRunning,
            startedAt: activeRuntime.startedAt,
            pausedAt: activeRuntime.pausedAt,
            accumulatedElapsedMs: activeRuntime.accumulatedElapsedMs,
            completed: activeRuntime.completed
          };
        });
        scheduleCountdownCompletion(get(), () => get().syncCountdownCompletion());
      },
      pauseTimer: () => {
        const state = get();
        const targetMode = normalizeMode(state.mode);
        const isActiveRunning = targetMode === "countdown" ? state.countdownIsRunning : state.timerIsRunning;
        if (!isActiveRunning) {
          return;
        }

        set((currentState) => {
          const now = Date.now();
          const nextState: WorkoutTimerState = {
            ...currentState,
            ...(targetMode === "countdown"
              ? {
                  countdownIsRunning: false,
                  countdownStartedAt: null,
                  countdownPausedAt: now,
                  countdownAccumulatedElapsedMs: getCountdownElapsedFromState(currentState)
                }
              : {
                  timerIsRunning: false,
                  timerStartedAt: null,
                  timerPausedAt: now,
                  timerAccumulatedElapsedMs: getTimerElapsedFromState(currentState)
                })
          };
          const activeRuntime = getActiveRuntimeState(nextState);
          return {
            ...nextState,
            isRunning: activeRuntime.isRunning,
            startedAt: activeRuntime.startedAt,
            pausedAt: activeRuntime.pausedAt,
            accumulatedElapsedMs: activeRuntime.accumulatedElapsedMs,
            completed: activeRuntime.completed
          };
        });
        if (targetMode === "countdown") {
          clearCountdownCompletionTimeout();
        }
      },
      resumeTimer: () => {
        const state = get();
        const targetMode = normalizeMode(state.mode);
        const isActiveRunning = targetMode === "countdown" ? state.countdownIsRunning : state.timerIsRunning;
        const isCompleted = targetMode === "countdown" && state.countdownCompleted;
        if (isActiveRunning || isCompleted) {
          return;
        }

        set((currentState) => {
          const nextState: WorkoutTimerState = {
            ...currentState,
            ...(targetMode === "countdown"
              ? {
                  countdownIsRunning: true,
                  countdownStartedAt: Date.now(),
                  countdownPausedAt: null,
                  countdownCompleted: false
                }
              : {
                  timerIsRunning: true,
                  timerStartedAt: Date.now(),
                  timerPausedAt: null
                })
          };
          const activeRuntime = getActiveRuntimeState(nextState);
          return {
            ...nextState,
            isRunning: activeRuntime.isRunning,
            startedAt: activeRuntime.startedAt,
            pausedAt: activeRuntime.pausedAt,
            accumulatedElapsedMs: activeRuntime.accumulatedElapsedMs,
            completed: activeRuntime.completed
          };
        });
        scheduleCountdownCompletion(get(), () => get().syncCountdownCompletion());
      },
      resetTimer: () => {
        const targetMode = normalizeMode(get().mode);
        if (targetMode === "countdown") {
          clearCountdownCompletionTimeout();
        }

        set((state) => {
          const nextState: WorkoutTimerState = {
            ...state,
            ...(targetMode === "countdown"
              ? {
                  countdownIsRunning: false,
                  countdownStartedAt: null,
                  countdownPausedAt: null,
                  countdownAccumulatedElapsedMs: 0,
                  countdownCompleted: false
                }
              : {
                  timerIsRunning: false,
                  timerStartedAt: null,
                  timerPausedAt: null,
                  timerAccumulatedElapsedMs: 0,
                  laps: []
                })
          };
          const activeRuntime = getActiveRuntimeState(nextState);
          return {
            ...nextState,
            isRunning: activeRuntime.isRunning,
            startedAt: activeRuntime.startedAt,
            pausedAt: activeRuntime.pausedAt,
            accumulatedElapsedMs: activeRuntime.accumulatedElapsedMs,
            completed: activeRuntime.completed
          };
        });
      },
      addLap: () => {
        const state = get();
        if (!state.timerIsRunning) {
          return;
        }

        set({ laps: [getTimerElapsedFromState(state), ...state.laps] });
      },
      switchMode: (mode) => {
        const targetMode = normalizeMode(mode);
        set((state) => {
          const nextState = { ...state, mode: targetMode };
          const activeRuntime = getActiveRuntimeState(nextState);
          return {
            ...nextState,
            isRunning: activeRuntime.isRunning,
            startedAt: activeRuntime.startedAt,
            pausedAt: activeRuntime.pausedAt,
            accumulatedElapsedMs: activeRuntime.accumulatedElapsedMs,
            completed: activeRuntime.completed
          };
        });
        scheduleCountdownCompletion(get(), () => get().syncCountdownCompletion());
      },
      setCountdownDuration: (durationMs) => {
        clearCountdownCompletionTimeout();
        set((state) => ({
          ...state,
          mode: "countdown",
          isRunning: false,
          startedAt: null,
          pausedAt: null,
          accumulatedElapsedMs: 0,
          countdownIsRunning: false,
          countdownStartedAt: null,
          countdownPausedAt: null,
          countdownAccumulatedElapsedMs: 0,
          countdownDurationMs: Math.max(1000, durationMs),
          countdownCompleted: false,
          completed: false
        }));
      },
      getElapsedMs: () => {
        const state = get();
        return normalizeMode(state.mode) === "countdown" ? getCountdownElapsedFromState(state) : getTimerElapsedFromState(state);
      },
      getRemainingMs: () => {
        const state = get();
        const durationMs = Number.isFinite(state.countdownDurationMs) ? state.countdownDurationMs : DEFAULT_COUNTDOWN_MS;
        return Math.max(0, durationMs - getCountdownElapsedFromState(state));
      },
      syncCountdownCompletion: () => {
        const state = get();
        if (!state.countdownIsRunning) {
          return false;
        }

        const durationMs = Number.isFinite(state.countdownDurationMs) ? state.countdownDurationMs : DEFAULT_COUNTDOWN_MS;
        const remainingMs = Math.max(0, durationMs - getCountdownElapsedFromState(state));
        if (remainingMs > 0) {
          return false;
        }

        set((currentState) => {
          const nextState = {
            ...currentState,
            countdownIsRunning: false,
            countdownStartedAt: null,
            countdownPausedAt: Date.now(),
            countdownAccumulatedElapsedMs: Number.isFinite(currentState.countdownDurationMs) ? currentState.countdownDurationMs : DEFAULT_COUNTDOWN_MS,
            countdownCompleted: true
          };
          const activeRuntime = getActiveRuntimeState(nextState);
          return {
            ...nextState,
            isRunning: activeRuntime.isRunning,
            startedAt: activeRuntime.startedAt,
            pausedAt: activeRuntime.pausedAt,
            accumulatedElapsedMs: activeRuntime.accumulatedElapsedMs,
            completed: activeRuntime.completed
          };
        });
        clearCountdownCompletionTimeout();
        Vibration.vibrate(COUNTDOWN_FINISHED_VIBRATION);
        return true;
      }
    }),
    {
      name: "gymind-workout-timer",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode,
        isRunning: state.isRunning,
        startedAt: state.startedAt,
        pausedAt: state.pausedAt,
        accumulatedElapsedMs: state.accumulatedElapsedMs,
        timerIsRunning: state.timerIsRunning,
        timerStartedAt: state.timerStartedAt,
        timerPausedAt: state.timerPausedAt,
        timerAccumulatedElapsedMs: state.timerAccumulatedElapsedMs,
        countdownIsRunning: state.countdownIsRunning,
        countdownStartedAt: state.countdownStartedAt,
        countdownPausedAt: state.countdownPausedAt,
        countdownAccumulatedElapsedMs: state.countdownAccumulatedElapsedMs,
        countdownDurationMs: state.countdownDurationMs,
        countdownCompleted: state.countdownCompleted,
        laps: state.laps,
        activeDrillId: state.activeDrillId,
        activeWorkoutId: state.activeWorkoutId,
        completed: state.completed
      }),
      onRehydrateStorage: () => (state) => {
        state?.syncCountdownCompletion();
        if (state) {
          scheduleCountdownCompletion(state, state.syncCountdownCompletion);
        }
      }
    }
  )
);
