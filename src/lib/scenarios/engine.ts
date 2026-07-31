import type {
  ScenarioAction,
  ScenarioEvent,
  ScenarioOptions,
  ScenarioResult,
  ScenarioSnapshot,
} from './types';

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function assertIsoDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} deve usar YYYY-MM-DD`);
}

export function simulateScenario(
  snapshot: ScenarioSnapshot,
  actions: ScenarioAction[],
  options: ScenarioOptions
): ScenarioResult {
  assertIsoDate(options.startDate, 'startDate');
  assertIsoDate(options.endDate, 'endDate');
  if (options.startDate > options.endDate) throw new Error('O início do cenário deve ser anterior ao fim');

  const accountById = new Map(snapshot.accounts.map((account) => [account.id, account]));
  const transactionById = new Map(snapshot.transactions.map((transaction) => [transaction.id, transaction]));
  const paidAmounts = new Map<string, number>();
  const events: Omit<ScenarioEvent, 'resultingBalance'>[] = [];

  const ensureAccount = (id: string) => {
    if (!accountById.has(id)) throw new Error(`Conta não encontrada: ${id}`);
  };
  const addEvent = (event: Omit<ScenarioEvent, 'resultingBalance'>) => {
    if (event.date >= options.startDate && event.date <= options.endDate) events.push(event);
  };

  actions.forEach((action) => {
    if (action.amount <= 0) throw new Error('O valor da ação deve ser maior que zero');
    assertIsoDate(action.date, 'action.date');

    if (action.type === 'transfer') {
      ensureAccount(action.fromAccountId);
      ensureAccount(action.toAccountId);
      if (action.fromAccountId === action.toAccountId) throw new Error('A transferência exige contas diferentes');
      addEvent({
        id: `action:${action.id}`,
        date: action.date,
        description: action.description || 'Transferência entre contas',
        kind: 'transfer',
        sourceId: action.id,
        deltas: [
          { accountId: action.fromAccountId, amount: -action.amount },
          { accountId: action.toAccountId, amount: action.amount },
        ],
      });
      return;
    }

    if (action.type === 'expense') {
      ensureAccount(action.accountId);
      addEvent({
        id: `action:${action.id}`,
        date: action.date,
        description: action.description,
        kind: 'expense',
        sourceId: action.id,
        deltas: [{ accountId: action.accountId, amount: -action.amount }],
      });
      return;
    }

    ensureAccount(action.accountId);
    const transaction = transactionById.get(action.transactionId);
    if (!transaction) throw new Error(`Movimentação não encontrada: ${action.transactionId}`);
    if (transaction.type !== 'expense') throw new Error('Somente despesas podem ser pagas no cenário');
    const alreadyPaid = paidAmounts.get(transaction.id) || 0;
    if (alreadyPaid + action.amount > transaction.amount) {
      throw new Error(`Pagamento excede o valor de ${transaction.description}`);
    }
    paidAmounts.set(transaction.id, roundMoney(alreadyPaid + action.amount));
    addEvent({
      id: `action:${action.id}`,
      date: action.date,
      description: `Pagamento: ${transaction.description}`,
      kind: 'payment',
      sourceId: transaction.id,
      deltas: [{ accountId: action.accountId, amount: -action.amount }],
    });
  });

  snapshot.transactions.forEach((transaction) => {
    const amountPaidInScenario = paidAmounts.get(transaction.id) || 0;
    const remaining = transaction.type === 'expense'
      ? roundMoney(transaction.amount - amountPaidInScenario)
      : transaction.amount;
    if (remaining <= 0) return;
    ensureAccount(transaction.accountId);
    addEvent({
      id: `transaction:${transaction.id}`,
      date: transaction.date,
      description: transaction.description,
      kind: transaction.type,
      sourceId: transaction.id,
      deltas: [{ accountId: transaction.accountId, amount: transaction.type === 'income' ? remaining : -remaining }],
    });
  });

  const priority = { income: 0, transfer: 1, payment: 2, expense: 3 } as const;
  events.sort((left, right) =>
    left.date.localeCompare(right.date) || priority[left.kind] - priority[right.kind] || left.id.localeCompare(right.id)
  );

  const balances = new Map(snapshot.accounts.map((account) => [account.id, account.balance]));
  const accountMinimums = new Map(snapshot.accounts.map((account) => [account.id, { value: account.balance, date: options.startDate }]));
  const startingBalance = roundMoney(snapshot.accounts.reduce((sum, account) => sum + account.balance, 0));
  let minimumBalance = startingBalance;
  let minimumBalanceDate = options.startDate;
  const uncovered = new Set<string>();
  const timeline: ScenarioEvent[] = [];

  events.forEach((event) => {
    event.deltas.forEach((delta) => {
      const nextBalance = roundMoney((balances.get(delta.accountId) || 0) + delta.amount);
      balances.set(delta.accountId, nextBalance);
      const currentMinimum = accountMinimums.get(delta.accountId)!;
      if (nextBalance < currentMinimum.value) accountMinimums.set(delta.accountId, { value: nextBalance, date: event.date });
      if (delta.amount < 0 && nextBalance < 0 && event.kind !== 'transfer') uncovered.add(event.sourceId);
    });
    const total = roundMoney([...balances.values()].reduce((sum, balance) => sum + balance, 0));
    if (total < minimumBalance) {
      minimumBalance = total;
      minimumBalanceDate = event.date;
    }
    timeline.push({ ...event, resultingBalance: total });
  });

  const coveredItems: string[] = [];
  const partiallyCoveredItems: string[] = [];
  snapshot.transactions.filter((item) => item.type === 'expense').forEach((item) => {
    const paid = paidAmounts.get(item.id) || 0;
    if (paid > 0 && paid < item.amount) partiallyCoveredItems.push(item.id);
    else if (!uncovered.has(item.id)) coveredItems.push(item.id);
  });

  const endingBalance = roundMoney([...balances.values()].reduce((sum, balance) => sum + balance, 0));
  const minimumReserve = Math.max(0, options.minimumReserve || 0);
  const warnings: string[] = [];
  if (uncovered.size > 0) warnings.push('Há despesas que deixam a conta de origem negativa.');
  if (minimumBalance < minimumReserve) warnings.push('O saldo total fica abaixo da reserva mínima configurada.');

  return {
    snapshotVersion: snapshot.version,
    period: { start: options.startDate, end: options.endDate },
    startingBalance,
    endingBalance,
    minimumBalance,
    minimumBalanceDate,
    safeToSpend: roundMoney(Math.max(0, minimumBalance - minimumReserve)),
    accounts: snapshot.accounts.map((account) => {
      const accountMinimum = accountMinimums.get(account.id)!;
      return {
        ...account,
        endingBalance: balances.get(account.id)!,
        minimumBalance: accountMinimum.value,
        minimumBalanceDate: accountMinimum.date,
      };
    }),
    timeline,
    coveredItems,
    partiallyCoveredItems,
    uncoveredItems: [...uncovered],
    warnings,
  };
}
