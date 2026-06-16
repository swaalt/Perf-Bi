"use client";

import { create } from "zustand";

export interface DataSource {
  id: string;
  name: string;
  type: string;
  host?: string | null;
  port?: number | null;
  database?: string | null;
  username?: string | null;
  filename?: string | null;
  apiUrl?: string | null;
  metadata?: string | null;
  createdAt: string;
}

interface ConnectionsStore {
  sources: DataSource[];
  activeSourceId: string | null;
  setSources: (sources: DataSource[]) => void;
  addSource: (source: DataSource) => void;
  updateSource: (source: DataSource) => void;
  removeSource: (id: string) => void;
  setActiveSource: (id: string | null) => void;
}

export const useConnectionsStore = create<ConnectionsStore>((set) => ({
  sources: [],
  activeSourceId: null,
  setSources: (sources) => set({ sources }),
  addSource: (source) => set((s) => ({ sources: [source, ...s.sources] })),
  updateSource: (source) =>
    set((s) => ({ sources: s.sources.map((x) => x.id === source.id ? source : x) })),
  removeSource: (id) =>
    set((s) => ({
      sources: s.sources.filter((x) => x.id !== id),
      activeSourceId: s.activeSourceId === id ? null : s.activeSourceId,
    })),
  setActiveSource: (id) => set({ activeSourceId: id }),
}));
