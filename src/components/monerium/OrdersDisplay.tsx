import React from "react";
import { useOrders, useAuth } from "@monerium/sdk-react-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Order, OrderKind, PaymentStandard } from "@monerium/sdk";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Badge } from "@/components/ui/badge";

type MonthGroup = {
  index: number;
  orders: Array<Order & { lastSynced: string }>;
};

type GroupedOrders = {
  [year: string]: {
    [month: string]: MonthGroup;
  };
};

type OrderFilter = {
  direction: "all" | "incoming" | "outgoing";
  type: "all" | "iban" | "onchain";
};

export function OrdersDisplay() {
  const { isAuthorized } = useAuth();
  const {
    data: moneriumOrders,
    isLoading: isMoneriumLoading,
    isError,
    refetch,
  } = useOrders();
  const [selectedYear, setSelectedYear] = React.useState<string>("");
  const [filter, setFilter] = React.useState<OrderFilter>({
    direction: "outgoing",
    type: "iban",
  });

  // Sync orders with local database whenever we get new data from Monerium
  React.useEffect(() => {
    if (moneriumOrders?.orders && isAuthorized) {
      db.syncMoneriumOrders(moneriumOrders.orders);
    }
  }, [moneriumOrders, isAuthorized]);

  // Use local database for displaying orders
  const localOrders = useLiveQuery(() => db.moneriumOrders.toArray(), [], []);

  const isLoading = isAuthorized
    ? isMoneriumLoading || !localOrders
    : !localOrders;

  // Filter and group orders by financial year and month
  const groupedOrders = React.useMemo(() => {
    if (!localOrders) return {};

    const filteredOrders = localOrders.filter((order) => {
      const isIncoming = order.kind === OrderKind.issue;
      const isIban =
        order.counterpart.identifier.standard === PaymentStandard.iban;

      const matchesDirection =
        filter.direction === "all"
          ? true
          : filter.direction === "incoming"
            ? isIncoming
            : !isIncoming;

      const matchesType =
        filter.type === "all"
          ? true
          : filter.type === "iban"
            ? isIban
            : !isIban;

      return matchesDirection && matchesType;
    });

    return filteredOrders.reduce((acc: GroupedOrders, order) => {
      const date = new Date(order.meta.approvedAt || order.meta.placedAt);
      const financialYear = date.getFullYear().toString();
      const monthIndex = date.getMonth();
      const month = date.toLocaleString("default", { month: "long" });

      if (!acc[financialYear]) {
        acc[financialYear] = {};
      }
      if (!acc[financialYear][month]) {
        acc[financialYear][month] = {
          index: monthIndex,
          orders: [],
        };
      }
      acc[financialYear][month].orders.push(order);
      return acc;
    }, {});
  }, [localOrders, filter]);

  // Set initial selected year
  React.useEffect(() => {
    if (Object.keys(groupedOrders).length > 0 && !selectedYear) {
      setSelectedYear(Object.keys(groupedOrders).sort().reverse()[0]);
    }
  }, [groupedOrders, selectedYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError && isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Error loading orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Failed to load orders</AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const years = Object.keys(groupedOrders).sort().reverse();

  if (years.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>No orders found</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {isAuthorized
                ? "No orders found in your Monerium account"
                : "No orders found in local storage"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Your EURe transactions by financial year
            </CardDescription>
          </div>
          {!isAuthorized && <Badge variant="secondary">Offline Mode</Badge>}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Direction:</span>
            <ToggleGroup
              type="single"
              value={filter.direction}
              onValueChange={(value) =>
                value &&
                setFilter((prev) => ({
                  ...prev,
                  direction: value as OrderFilter["direction"],
                }))
              }
            >
              <ToggleGroupItem value="outgoing">Outgoing</ToggleGroupItem>
              <ToggleGroupItem value="incoming">Incoming</ToggleGroupItem>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Type:</span>
            <ToggleGroup
              type="single"
              value={filter.type}
              onValueChange={(value) =>
                value &&
                setFilter((prev) => ({
                  ...prev,
                  type: value as OrderFilter["type"],
                }))
              }
            >
              <ToggleGroupItem value="iban">IBAN</ToggleGroupItem>
              <ToggleGroupItem value="onchain">Onchain</ToggleGroupItem>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedYear} onValueChange={setSelectedYear}>
          <TabsList className="mb-4">
            {years.map((year) => (
              <TabsTrigger key={year} value={year}>
                FY {year}
              </TabsTrigger>
            ))}
          </TabsList>
          {years.map((year) => (
            <TabsContent key={year} value={year}>
              <ScrollArea className="h-[600px] pr-4">
                {Object.entries(groupedOrders[year])
                  .sort(([, a], [, b]) => b.index - a.index)
                  .map(([month, { orders: monthOrders }]) => (
                    <div key={month} className="mb-8">
                      <h3 className="font-semibold text-lg mb-4">{month}</h3>
                      <div className="space-y-4">
                        {monthOrders.map((order) => {
                          const isIncoming = order.kind === OrderKind.issue;
                          const isOnchain =
                            order.counterpart.identifier.standard ===
                            PaymentStandard.chain;

                          return (
                            <div
                              key={order.id}
                              className={`p-4 border rounded-lg ${
                                isIncoming
                                  ? "border-l-4 border-l-green-500"
                                  : "border-l-4 border-l-blue-500"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold flex items-center gap-2">
                                    <span>
                                      {isIncoming ? "+" : "-"}€
                                      {Number(order.amount).toFixed(2)}
                                    </span>
                                    <span
                                      className={`text-sm ${
                                        isOnchain
                                          ? "text-purple-600"
                                          : "text-orange-600"
                                      }`}
                                    >
                                      {isOnchain ? "⛓ Onchain" : "🏦 Wire"}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(
                                      order.meta.approvedAt ||
                                        order.meta.placedAt,
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="text-sm">
                                  <span
                                    className={`px-2 py-1 rounded-full ${
                                      order.meta.state === "processed"
                                        ? "bg-green-100 text-green-800"
                                        : order.meta.state === "pending"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : order.meta.state === "rejected"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {order.meta.state}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                {order.counterpart.identifier.standard ===
                                  PaymentStandard.iban && (
                                  <>IBAN: {order.counterpart.identifier.iban}</>
                                )}
                                {order.counterpart.identifier.standard ===
                                  PaymentStandard.chain && (
                                  <>
                                    Address:{" "}
                                    {order.counterpart.identifier.address}
                                  </>
                                )}
                              </div>
                              {order.memo && (
                                <div className="mt-1 text-sm text-muted-foreground">
                                  Memo: {order.memo}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
