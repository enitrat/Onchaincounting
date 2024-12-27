import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Invoice } from "../types/types";
import { db } from "../db/db";
import { InvoiceForm } from "./InvoiceForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MonthGroup {
  month: number;
  year: number;
  invoices: Invoice[];
  // Native currency totals
  totalBeforeTaxUsdAmount: number;
  totalAfterTaxUsdAmount: number;
  totalBeforeTaxChfAmount: number;
  totalAfterTaxChfAmount: number;
  // EUR totals for accounting
  totalBeforeTaxEurAmount: number;
  totalAfterTaxEurAmount: number;
  totalVatEurAmount: number;
}

export function MonthlyInvoices() {
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear(),
  );
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingInvoice, setEditingInvoice] = React.useState<Invoice | null>(
    null,
  );

  // Fetch all invoices for the selected year
  const invoices = useLiveQuery(
    () =>
      db.invoices
        .where("date")
        .between(
          new Date(selectedYear, 0, 1),
          new Date(selectedYear, 11, 31, 23, 59, 59),
        )
        .toArray(),
    [selectedYear],
  );

  // Group invoices by month
  const monthlyGroups = React.useMemo(() => {
    if (!invoices) return [];

    const groups: MonthGroup[] = [];
    for (let month = 0; month < 12; month++) {
      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.date).getMonth() === month,
      );

      if (monthInvoices.length > 0) {
        const usdInvoices = monthInvoices.filter(
          (inv) => inv.currency === "USD",
        );
        const chfInvoices = monthInvoices.filter(
          (inv) => inv.currency === "CHF",
        );

        groups.push({
          month,
          year: selectedYear,
          invoices: monthInvoices,
          // Native currency totals
          totalBeforeTaxUsdAmount: usdInvoices.reduce(
            (sum, inv) => sum + inv.beforeTaxAmount,
            0,
          ),
          totalAfterTaxUsdAmount: usdInvoices.reduce(
            (sum, inv) => sum + inv.afterTaxAmount,
            0,
          ),
          totalBeforeTaxChfAmount: chfInvoices.reduce(
            (sum, inv) => sum + inv.beforeTaxAmount,
            0,
          ),
          totalAfterTaxChfAmount: chfInvoices.reduce(
            (sum, inv) => sum + inv.afterTaxAmount,
            0,
          ),
          // EUR totals
          totalBeforeTaxEurAmount: monthInvoices.reduce(
            (sum, inv) => sum + inv.beforeTaxEurAmount,
            0,
          ),
          totalAfterTaxEurAmount: monthInvoices.reduce(
            (sum, inv) => sum + inv.afterTaxEurAmount,
            0,
          ),
          totalVatEurAmount: monthInvoices.reduce(
            (sum, inv) => sum + inv.vatEurAmount,
            0,
          ),
        });
      }
    }

    return groups.sort((a, b) => b.month - a.month);
  }, [invoices, selectedYear]);

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      await db.invoices.delete(invoice.id);
    }
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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
          <h1 className="text-3xl font-bold">Invoices</h1>
        </div>
        <Button onClick={() => setShowAddForm(true)} variant="default">
          Add Invoice
        </Button>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceForm onSuccess={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingInvoice}
        onOpenChange={() => setEditingInvoice(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          {editingInvoice && (
            <InvoiceForm
              initialData={editingInvoice}
              onSuccess={() => setEditingInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-8">
        {monthlyGroups.map((group) => (
          <Card key={group.month}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {monthNames[group.month]} {group.year}
                  </CardTitle>
                  <CardDescription>Monthly invoice summary</CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>
                    Total EUR (converted): €
                    {group.totalBeforeTaxEurAmount.toFixed(2)}
                  </div>
                  <div>
                    Total VAT EUR: €{group.totalVatEurAmount.toFixed(2)}
                  </div>
                  <div>
                    Total After Tax EUR: €
                    {group.totalAfterTaxEurAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Currency</TableHead>
                    <TableHead className="text-right">Currency Rate</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">
                      After Tax Amount
                    </TableHead>
                    <TableHead className="text-right">EUR Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell className="text-right">
                        {invoice.beforeTaxAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.currency}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.exchangeRate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.vatRate.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.afterTaxAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        €{invoice.afterTaxEurAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => setEditingInvoice(invoice)}
                          className="mr-2"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteInvoice(invoice)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {monthlyGroups.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No invoices found for {selectedYear}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
