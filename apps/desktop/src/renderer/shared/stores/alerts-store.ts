import { create } from 'zustand';
import type { Alert } from '../types/alerts';

const QUEUE_CAP = 5;

interface AlertsState {
  currentAlert: Alert | null;
  queue: Alert[];
  enqueueAlert: (alert: Alert) => void;
  dismissCurrent: () => void;
  clearQueue: () => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  currentAlert: null,
  queue: [],

  enqueueAlert: (alert) => {
    const { queue, currentAlert } = get();
    if (currentAlert === null) {
      set({ currentAlert: alert });
    } else {
      // Cap queue: drop oldest if at cap
      const newQueue = queue.length >= QUEUE_CAP ? queue.slice(1) : queue;
      set({ queue: [...newQueue, alert] });
    }
  },

  dismissCurrent: () => {
    const { queue } = get();
    const next = queue[0] ?? null;
    const rest = queue.slice(1);
    set({ currentAlert: next, queue: rest });
  },

  clearQueue: () => {
    set({ currentAlert: null, queue: [] });
  },
}));
