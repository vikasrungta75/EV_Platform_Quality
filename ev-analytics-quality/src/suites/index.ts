import type { ComponentType } from 'react';
import CommandCentre from './CommandCentre';
import AlertCentre from './AlertCentre';
import Agents from './Agents';
import EarlyWarning from './EarlyWarning';
import RootCause from './RootCause';
import Vehicle360 from './Vehicle360';
import Predictive from './Predictive';
import Recall from './Recall';
import Warranty from './Warranty';
import Supplier from './Supplier';
import Blueprint from './Blueprint';
import { KpiLibrary, Research, Users } from './Reference';

export const SUITES: Record<string, ComponentType<{ page: string }>> = {
  home: CommandCentre, alerts: AlertCentre, agents: Agents, early: EarlyWarning, rootcause: RootCause, vehicle: Vehicle360,
  predict: Predictive, recall: Recall, warranty: Warranty, supplier: Supplier, blueprint: Blueprint, kpis: KpiLibrary, research: Research, users: Users,
};
