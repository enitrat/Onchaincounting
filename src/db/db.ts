import Dexie, { Table } from 'dexie';
import { Invoice, Expense, Withdrawal, MonthlySummary, YearlySummary } from '../types/types';

export class CryptoAccountingDB extends Dexie {
    invoices!: Table<Invoice, string>;
    expenses!: Table<Expense, string>;
    withdrawals!: Table<Withdrawal, string>;
    monthlySummaries!: Table<MonthlySummary, string>;
    yearlySummaries!: Table<YearlySummary, number>;

    constructor() {
        super('CryptoAccountingDB');

        this.version(1).stores({
            invoices: 'id, date, invoiceNumber, clientName',
            expenses: 'id, date, category',
            withdrawals: 'id, date, status',
            monthlySummaries: '[year+month], year, month',
            yearlySummaries: 'year'
        });
    }
}

export const db = new CryptoAccountingDB();

// Export hooks for easier data access
export function useInvoices() {
    return db.invoices.toArray();
}

export function useExpenses() {
    return db.expenses.toArray();
}

export function useWithdrawals() {
    return db.withdrawals.toArray();
}

export function useMonthlySummary(year: number, month: number) {
    return db.monthlySummaries
        .where(['year', 'month'])
        .equals([year, month])
        .first();
}

export function useYearlySummary(year: number) {
    return db.yearlySummaries
        .where('year')
        .equals(year)
        .first();
}

// Helper function to generate unique IDs
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
