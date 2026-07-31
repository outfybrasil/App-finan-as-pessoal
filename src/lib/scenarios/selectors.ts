import type { Account, Transaction } from '../../types';
import type { ScenarioSnapshot } from './types';

function stableSnapshotVersion(accounts: Account[], transactions: Transaction[]): string {
  const source = JSON.stringify({
    accounts: accounts.map(({ id, balance }) => [id, balance]).sort(),
    transactions: transactions.map(({ id, amount, status, date, accountId }) => [id, amount, status, date, accountId]).sort(),
  });

  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createScenarioSnapshot(
  accounts: Account[],
  transactions: Transaction[]
): ScenarioSnapshot {
  return {
    accounts: accounts.map(({ id, name, balance }) => ({ id, name, balance })),
    transactions: transactions
      .filter((transaction) => transaction.status !== 'completed' && transaction.kind !== 'card_purchase')
      .map(({ id, description, amount, type, status, date, accountId }) => ({
        id,
        description,
        amount,
        type,
        status: status === 'scheduled' ? 'scheduled' : 'pending',
        date,
        accountId,
      })),
    version: stableSnapshotVersion(accounts, transactions),
  };
}
