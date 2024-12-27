import Dexie, { Table } from "dexie";
import {
  Invoice,
  Expense,
  Withdrawal,
  MonthlySummary,
  YearlySummary,
} from "../types/types";

export class CryptoAccountingDB extends Dexie {
  invoices!: Table<Invoice, string>;
  expenses!: Table<Expense, string>;
  withdrawals!: Table<Withdrawal, string>;
  monthlySummaries!: Table<MonthlySummary, string>;
  yearlySummaries!: Table<YearlySummary, number>;

  constructor() {
    super("CryptoAccountingDB");

    this.version(1).stores({
      invoices: "id, date, invoiceNumber, clientName",
      expenses: "id, date, category",
      withdrawals: "id, date, status",
      monthlySummaries: "[year+month], year, month",
      yearlySummaries: "year",
    });
  }

  // Export the entire database to a JSON file
  async exportData(): Promise<Blob> {
    const data = {
      invoices: await this.invoices.toArray(),
      expenses: await this.expenses.toArray(),
      withdrawals: await this.withdrawals.toArray(),
      monthlySummaries: await this.monthlySummaries.toArray(),
      yearlySummaries: await this.yearlySummaries.toArray(),
    };

    // Convert dates to ISO strings for proper serialization
    const processedData = JSON.stringify(data, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });

    return new Blob([processedData], { type: "application/json" });
  }

  // Import data from a JSON file
  async importData(file: File): Promise<void> {
    try {
      const text = await file.text();
      const data = JSON.parse(text, (key, value) => {
        // Convert ISO date strings back to Date objects
        if (
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(value)
        ) {
          return new Date(value);
        }
        return value;
      });

      // Start a transaction to ensure data consistency
      await this.transaction(
        "rw",
        [
          this.invoices,
          this.expenses,
          this.withdrawals,
          this.monthlySummaries,
          this.yearlySummaries,
        ],
        async () => {
          // Clear existing data
          await Promise.all([
            this.invoices.clear(),
            this.expenses.clear(),
            this.withdrawals.clear(),
            this.monthlySummaries.clear(),
            this.yearlySummaries.clear(),
          ]);

          // Import new data
          await Promise.all([
            this.invoices.bulkAdd(data.invoices),
            this.expenses.bulkAdd(data.expenses),
            this.withdrawals.bulkAdd(data.withdrawals),
            this.monthlySummaries.bulkAdd(data.monthlySummaries),
            this.yearlySummaries.bulkAdd(data.yearlySummaries),
          ]);
        },
      );
    } catch (error) {
      console.error("Error importing data:", error);
      throw new Error(
        "Failed to import database. Please check the file format.",
      );
    }
  }

  // Merge data from a JSON file (adds to existing data instead of replacing)
  async mergeData(file: File): Promise<void> {
    try {
      const text = await file.text();
      const data = JSON.parse(text, (key, value) => {
        if (
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(value)
        ) {
          return new Date(value);
        }
        return value;
      });

      await this.transaction(
        "rw",
        [
          this.invoices,
          this.expenses,
          this.withdrawals,
          this.monthlySummaries,
          this.yearlySummaries,
        ],
        async () => {
          // Merge new data with existing data
          await Promise.all([
            this.invoices.bulkPut(data.invoices),
            this.expenses.bulkPut(data.expenses),
            this.withdrawals.bulkPut(data.withdrawals),
            this.monthlySummaries.bulkPut(data.monthlySummaries),
            this.yearlySummaries.bulkPut(data.yearlySummaries),
          ]);
        },
      );
    } catch (error) {
      console.error("Error merging data:", error);
      throw new Error(
        "Failed to merge database. Please check the file format.",
      );
    }
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
    .where(["year", "month"])
    .equals([year, month])
    .first();
}

export function useYearlySummary(year: number) {
  return db.yearlySummaries.where("year").equals(year).first();
}

// Helper function to generate unique IDs
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper functions for database operations
export async function exportDatabase(): Promise<void> {
  const blob = await db.exportData();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cryptaccounting-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importDatabase(
  file: File,
  merge: boolean = false,
): Promise<void> {
  if (merge) {
    await db.mergeData(file);
  } else {
    await db.importData(file);
  }
}
