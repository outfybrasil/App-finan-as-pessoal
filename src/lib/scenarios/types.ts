export interface ScenarioAccount {
  id: string;
  name: string;
  balance: number;
}

export interface ScenarioTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'scheduled';
  date: string;
  accountId: string;
}

export interface ScenarioSnapshot {
  accounts: ScenarioAccount[];
  transactions: ScenarioTransaction[];
  version: string;
}

export interface PaymentAction {
  id: string;
  type: 'payment';
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
}

export interface TransferAction {
  id: string;
  type: 'transfer';
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}

export interface ExpenseAction {
  id: string;
  type: 'expense';
  accountId: string;
  amount: number;
  date: string;
  description: string;
}

export type ScenarioAction = PaymentAction | TransferAction | ExpenseAction;

export interface ScenarioOptions {
  startDate: string;
  endDate: string;
  minimumReserve?: number;
}

export interface ScenarioDelta {
  accountId: string;
  amount: number;
}

export interface ScenarioEvent {
  id: string;
  date: string;
  description: string;
  kind: 'income' | 'expense' | 'payment' | 'transfer';
  sourceId: string;
  deltas: ScenarioDelta[];
  resultingBalance: number;
}

export interface ScenarioAccountResult extends ScenarioAccount {
  endingBalance: number;
  minimumBalance: number;
  minimumBalanceDate: string;
}

export interface ScenarioResult {
  snapshotVersion: string;
  period: { start: string; end: string };
  startingBalance: number;
  endingBalance: number;
  minimumBalance: number;
  minimumBalanceDate: string;
  safeToSpend: number;
  accounts: ScenarioAccountResult[];
  timeline: ScenarioEvent[];
  coveredItems: string[];
  partiallyCoveredItems: string[];
  uncoveredItems: string[];
  warnings: string[];
}
