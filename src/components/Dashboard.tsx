"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DatabaseActions } from "./DatabaseActions";
import { OrderKind } from "@monerium/sdk";

interface YearSummary {
  year: number;
  invoices: {
    totalBeforeTaxUsdAmount: number;
    totalAfterTaxUsdAmount: number;
    totalBeforeTaxChfAmount: number;
    totalAfterTaxChfAmount: number;
    totalBeforeTaxEurAmount: number;
    totalAfterTaxEurAmount: number;
    totalVatEurAmount: number;
    count: number;
  };
  offramps: {
    totalEurAmount: number;
    count: number;
  };
}

interface MonthSummary {
  month: number;
  // Monthly amounts
  invoicesUSD: number;
  invoicesCHF: number;
  invoicesEUR: number;
  offrampsEUR: number;
  // Cumulative amounts
  cumulativeEUR: number;
  cumulativeOfframpEUR: number;
}

export function Dashboard() {
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear(),
  );
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "invoices" | "offramps"
  >("overview");

  const yearData = useLiveQuery(async () => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

    const [invoices, moneriumOrders] = await Promise.all([
      db.invoices.where("date").between(startDate, endDate).toArray(),
      db.moneriumOrders
        .where("meta.placedAt")
        .between(startDate, endDate)
        .toArray(),
    ]);

    const offramps = moneriumOrders.filter(
      (order) => order.kind === OrderKind.redeem,
    );
    const summary: YearSummary = {
      year: selectedYear,
      invoices: {
        totalBeforeTaxUsdAmount: invoices
          .filter((inv) => inv.currency === "USD")
          .reduce((sum, inv) => sum + inv.beforeTaxAmount, 0),
        totalAfterTaxUsdAmount: invoices
          .filter((inv) => inv.currency === "USD")
          .reduce((sum, inv) => sum + inv.afterTaxAmount, 0),
        totalBeforeTaxChfAmount: invoices
          .filter((inv) => inv.currency === "CHF")
          .reduce((sum, inv) => sum + inv.beforeTaxAmount, 0),
        totalAfterTaxChfAmount: invoices
          .filter((inv) => inv.currency === "CHF")
          .reduce((sum, inv) => sum + inv.afterTaxAmount, 0),
        totalBeforeTaxEurAmount: invoices.reduce(
          (sum, inv) => sum + inv.beforeTaxEurAmount,
          0,
        ),
        totalAfterTaxEurAmount: invoices.reduce(
          (sum, inv) => sum + inv.afterTaxEurAmount,
          0,
        ),
        totalVatEurAmount: invoices.reduce(
          (sum, inv) => sum + inv.vatEurAmount,
          0,
        ),
        count: invoices.length,
      },
      offramps: {
        totalEurAmount: offramps.reduce((sum, w) => sum + Number(w.amount), 0),
        count: offramps.length,
      },
    };

    const monthSummaries: MonthSummary[] = Array.from(
      { length: 12 },
      (_, month) => {
        const monthInvoices = invoices.filter(
          (inv) => new Date(inv.date).getMonth() === month,
        );
        const monthOfframps = offramps.filter(
          (w) =>
            new Date(w.meta.approvedAt || w.meta.placedAt).getMonth() === month,
        );

        const usdInvoices = monthInvoices.filter(
          (inv) => inv.currency === "USD",
        );
        const chfInvoices = monthInvoices.filter(
          (inv) => inv.currency === "CHF",
        );

        const monthData = {
          month,
          invoicesUSD: usdInvoices.reduce(
            (sum, inv) => sum + inv.afterTaxAmount,
            0,
          ),
          invoicesCHF: chfInvoices.reduce(
            (sum, inv) => sum + inv.afterTaxAmount,
            0,
          ),
          invoicesEUR: monthInvoices.reduce(
            (sum, inv) => sum + inv.afterTaxAmount / inv.exchangeRate,
            0,
          ),
          offrampsEUR: monthOfframps.reduce(
            (sum, w) => sum + Number(w.amount),
            0,
          ),
          cumulativeEUR: 0, // Will be calculated after
          cumulativeOfframpEUR: 0, // Will be calculated after
        };

        return monthData;
      },
    );

    // Calculate cumulative amounts
    let runningEUR = 0,
      runningOfframpEUR = 0;
    monthSummaries.forEach((month) => {
      runningEUR += month.invoicesEUR;
      runningOfframpEUR += month.offrampsEUR;
      month.cumulativeEUR = runningEUR;
      month.cumulativeOfframpEUR = runningOfframpEUR;
    });

    return { summary, monthSummaries };
  }, [selectedYear]);

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

  if (!yearData) return <div>Loading...</div>;

  const { summary, monthSummaries } = yearData;

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
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="space-y-8"
      >
        <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground w-full"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground w-full"
          >
            Invoices
          </TabsTrigger>
          <TabsTrigger
            value="offramps"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground w-full"
          >
            Offramps
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Income</CardTitle>
                <CardDescription>Total invoiced amount</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  €{summary.invoices.totalAfterTaxEurAmount.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {summary.invoices.count} invoices
                </p>
                <p className="text-sm text-muted-foreground">
                  USD: ${summary.invoices.totalAfterTaxUsdAmount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  CHF: {summary.invoices.totalAfterTaxChfAmount.toFixed(2)} CHF
                </p>
                <p className="text-sm text-muted-foreground">
                  VAT (EUR): €{summary.invoices.totalVatEurAmount.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Offramps</CardTitle>
                <CardDescription>Total offramped amount</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  €{summary.offramps.totalEurAmount.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {summary.offramps.count} offramps
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Profit (EUR)</CardTitle>
                <CardDescription>Before offramps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold text-green-600`}>
                  €{summary.invoices.totalAfterTaxEurAmount.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  monthlyEUR: {
                    label: "Monthly Income (EUR)",
                    color: "hsl(var(--chart-1))",
                  },
                  cumulativeEUR: {
                    label: "Cumulative Income (EUR)",
                    color: "hsl(var(--chart-2))",
                  },
                  offrampsEUR: {
                    label: "Monthly Offramps (EUR)",
                    color: "hsl(var(--chart-3))",
                  },
                  cumulativeOfframpEUR: {
                    label: "Cumulative Offramp (EUR)",
                    color: "hsl(var(--chart-4))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthSummaries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) =>
                        monthNames[value].substring(0, 3)
                      }
                    />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="invoicesEUR"
                      name="Monthly Income (EUR)"
                      fill="var(--color-monthlyEUR)"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="offrampsEUR"
                      name="Monthly Offramps (EUR)"
                      fill="var(--color-offrampsEUR)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativeEUR"
                      name="Cumulative Income (EUR)"
                      stroke="var(--color-cumulativeEUR)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativeOfframpEUR"
                      name="Cumulative Offramp (EUR)"
                      stroke="var(--color-cumulativeOfframpEUR)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income (USD)</TableHead>
                    <TableHead className="text-right">Offramps (EUR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthSummaries.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell>{monthNames[month.month]}</TableCell>
                      <TableCell className="text-right">
                        ${month.invoicesUSD.toFixed(2)} / CHF{" "}
                        {month.invoicesCHF.toFixed(2)}
                        <br />
                        <span className="text-sm text-muted-foreground">
                          €{month.invoicesEUR.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        €{month.offrampsEUR.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <DatabaseActions />
        </TabsContent>
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Invoice details will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="offramps">
          <Card>
            <CardHeader>
              <CardTitle>Offramps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Offramp details will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
