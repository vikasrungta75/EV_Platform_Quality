'use client';
import { createContext, useContext } from 'react';

export type AnalysisRequest = { title: string; sub?: string; facts: string[]; data?: string; scope?: 'chart' | 'page' };
export type AppCtx = {
  me: any;
  openAnalysis: (r: AnalysisRequest) => void;
  ask: (text: string, extra?: string) => void;
  toast: (msg: string) => void;
  openVehicle: (vin: string) => void;
  go: (page: string, params?: Record<string, string>) => void;
};
export const AppContext = createContext<AppCtx>({ me: null, openAnalysis: () => {}, ask: () => {}, toast: () => {}, openVehicle: () => {}, go: () => {} });
export const useApp = () => useContext(AppContext);
