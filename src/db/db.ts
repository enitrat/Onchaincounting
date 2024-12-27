import Dexie, { Table } from "dexie";
import React from "react";
import {
  Invoice,
  Expense,
  Withdrawal,
  MonthlySummary,
  YearlySummary,
} from "../types/types";
import { Order } from "@monerium/sdk";

export class CryptoAccountingDB extends Dexie {
  invoices!: Table<Invoice, string>;
  expenses!: Table<Expense, string>;
  withdrawals!: Table<Withdrawal, string>;
  monthlySummaries!: Table<MonthlySummary, string>;
  yearlySummaries!: Table<YearlySummary, number>;
  moneriumOrders!: Table<Order & { lastSynced: string }>;

  constructor() {
    super("CryptoAccountingDB");

    this.version(1).stores({
      invoices: "id, date, invoiceNumber, clientName",
      expenses: "id, date, category",
      withdrawals: "id, date, status",
      monthlySummaries: "[year+month], year, month",
      yearlySummaries: "year",
    });

    // Add moneriumOrders table in version 2
    this.version(2).stores({
      moneriumOrders: "id, meta.placedAt, meta.state, kind, amount",
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
      moneriumOrders: await this.moneriumOrders.toArray(),
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
          this.moneriumOrders,
        ],
        async () => {
          // Clear existing data
          await Promise.all([
            this.invoices.clear(),
            this.expenses.clear(),
            this.withdrawals.clear(),
            this.monthlySummaries.clear(),
            this.yearlySummaries.clear(),
            this.moneriumOrders.clear(),
          ]);

          // Import new data
          await Promise.all([
            this.invoices.bulkAdd(data.invoices || []),
            this.expenses.bulkAdd(data.expenses || []),
            this.withdrawals.bulkAdd(data.withdrawals || []),
            this.monthlySummaries.bulkAdd(data.monthlySummaries || []),
            this.yearlySummaries.bulkAdd(data.yearlySummaries || []),
            data.moneriumOrders &&
              this.moneriumOrders.bulkAdd(data.moneriumOrders || []),
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
          this.moneriumOrders,
        ],
        async () => {
          // Merge new data with existing data
          await Promise.all([
            this.invoices.bulkPut(data.invoices),
            this.expenses.bulkPut(data.expenses),
            this.withdrawals.bulkPut(data.withdrawals),
            this.monthlySummaries.bulkPut(data.monthlySummaries),
            this.yearlySummaries.bulkPut(data.yearlySummaries),
            data.moneriumOrders &&
              this.moneriumOrders.bulkPut(data.moneriumOrders),
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

  // Sync Monerium orders with local database
  async syncMoneriumOrders(orders: Order[]) {
    await this.transaction("rw", this.moneriumOrders, async () => {
      const now = new Date().toISOString();
      const ordersToAdd = orders.map((order) => ({
        ...order,
        lastSynced: now,
      }));

      await this.moneriumOrders.bulkPut(ordersToAdd);

      // Store last sync timestamp
      localStorage.setItem("monerium_last_sync", now);
    });
  }

  // Get sync status
  async getMoneriumSyncStatus() {
    const lastSync = localStorage.getItem("monerium_last_sync");
    const count = await this.moneriumOrders.count();

    return {
      lastSynced: lastSync ? new Date(lastSync) : null,
      hasLocalData: count > 0,
    };
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
  a.download = `onchaincounting-backup-${new Date().toISOString().split("T")[0]}.json`;
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

// Add hook for Monerium orders
export function useMoneriumOrders() {
  return db.moneriumOrders.toArray();
}

// Add hook for Monerium sync status
export function useMoneriumSyncStatus() {
  const [status, setStatus] = React.useState<{
    lastSynced: Date | null;
    hasLocalData: boolean;
  }>({
    lastSynced: null,
    hasLocalData: false,
  });

  React.useEffect(() => {
    const checkStatus = async () => {
      const currentStatus = await db.getMoneriumSyncStatus();
      setStatus(currentStatus);
    };

    // Initial check
    checkStatus();

    // Check status every minute and when local storage changes
    const interval = setInterval(checkStatus, 60000);
    window.addEventListener("storage", () => checkStatus());

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", () => checkStatus());
    };
  }, []);

  return status;
}
