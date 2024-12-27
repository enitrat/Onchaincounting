import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaxReport {
  income: {
    totalUSD: number;
    totalVAT: number;
    vatRate: number;
  };
  expenses: {
    totalUSD: number;
    totalEUR: number;
    vatDeductible: number;
  };
  withdrawals: {
    totalSourceUSD: number;
    totalTargetEUR: number;
    averageExchangeRate: number;
    profitLoss: number;
  };
  summary: {
    netIncomeUSD: number;
    netProfitLoss: number;
    vatPayable: number;
  };
}

export function Reports() {
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear(),
  );
  const [selectedReport, setSelectedReport] = React.useState<
    "tax" | "profit-loss" | "vat"
  >("tax");

  const report = useLiveQuery(async () => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

    const [invoices, expenses, withdrawals] = await Promise.all([
      db.invoices.where("date").between(startDate, endDate).toArray(),
      db.expenses.where("date").between(startDate, endDate).toArray(),
      db.withdrawals.where("date").between(startDate, endDate).toArray(),
    ]);

    // Calculate VAT details
    const totalVAT = invoices.reduce((sum, inv) => sum + inv.vatAmount, 0);
    const vatDeductible = expenses
      .filter((exp) => exp.vatDeductible)
      .reduce((sum, exp) => sum + exp.amount * 0.2, 0); // Assuming 20% VAT rate

    // Calculate withdrawal profit/loss
    const totalSourceUSD = withdrawals.reduce(
      (sum, w) => sum + (w.sourceCurrency === "USDC" ? w.sourceAmount : 0),
      0,
    );
    const totalTargetEUR = withdrawals.reduce(
      (sum, w) => sum + w.targetAmount,
      0,
    );
    const averageExchangeRate = totalTargetEUR / totalSourceUSD;

    // Calculate profit/loss from exchange rate fluctuations
    const profitLoss = withdrawals.reduce((sum, w) => {
      if (w.sourceCurrency === "USDC") {
        const expectedEUR = w.sourceAmount * averageExchangeRate;
        return sum + (w.targetAmount - expectedEUR);
      }
      return sum;
    }, 0);

    return {
      income: {
        totalUSD: invoices.reduce((sum, inv) => sum + inv.afterTaxAmount, 0),
        totalVAT,
        vatRate: 20, // Assuming 20% VAT rate
      },
      withdrawals: {
        totalSourceUSD,
        totalTargetEUR,
        averageExchangeRate,
        profitLoss,
      },
      summary: {
        netIncomeUSD:
          invoices.reduce((sum, inv) => sum + inv.afterTaxAmount, 0) -
          expenses.reduce(
            (sum, exp) => sum + (exp.currency === "USD" ? exp.amount : 0),
            0,
          ),
        netProfitLoss: profitLoss,
        vatPayable: totalVAT - vatDeductible,
      },
    } as TaxReport;
  }, [selectedYear]);

  if (!report) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
        </div>
        <div className="flex space-x-4">
          {(["tax", "profit-loss", "vat"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedReport(type)}
              className={`px-4 py-2 rounded-md ${
                selectedReport === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Income</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Income (USD)</span>
              <span className="font-medium">
                ${report.income.totalUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>VAT Collected</span>
              <span className="font-medium">
                ${report.income.totalVAT.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>VAT Rate</span>
              <span>{report.income.vatRate}%</span>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Expenses</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Expenses (USD)</span>
              <span className="font-medium">
                ${report.expenses.totalUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Expenses (EUR)</span>
              <span className="font-medium">
                €{report.expenses.totalEUR.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>VAT Deductible</span>
              <span className="font-medium">
                ${report.expenses.vatDeductible.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Withdrawals Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Withdrawals
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Withdrawn (USD)</span>
              <span className="font-medium">
                ${report.withdrawals.totalSourceUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Received (EUR)</span>
              <span className="font-medium">
                €{report.withdrawals.totalTargetEUR.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Average Exchange Rate</span>
              <span className="font-medium">
                {report.withdrawals.averageExchangeRate.toFixed(4)} EUR/USD
              </span>
            </div>
            <div className="flex justify-between">
              <span>Exchange Profit/Loss</span>
              <span
                className={`font-medium ${
                  report.withdrawals.profitLoss >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                €{report.withdrawals.profitLoss.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Net Income (USD)</span>
              <span
                className={`font-medium ${
                  report.summary.netIncomeUSD >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                ${report.summary.netIncomeUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Exchange Profit/Loss</span>
              <span
                className={`font-medium ${
                  report.summary.netProfitLoss >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                €{report.summary.netProfitLoss.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>VAT Payable</span>
              <span className="font-medium">
                ${report.summary.vatPayable.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => {
            // TODO: Implement report export functionality
            console.log("Export report:", report);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Export Report
        </button>
      </div>
    </div>
  );
}
