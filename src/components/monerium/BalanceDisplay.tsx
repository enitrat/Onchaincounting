import React from "react";
import {
  useBalances,
  useProfile,
  useAddresses,
} from "@monerium/sdk-react-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Currency } from "@monerium/sdk";

export function BalanceDisplay() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: addressResponse, isLoading: addressLoading } = useAddresses({
    profile: profile?.id,
  });

  const currentAddress = addressResponse?.addresses?.[0]?.address;

  const { data: balances, isLoading: balanceLoading } = useBalances({
    address: currentAddress ?? "",
    chain: "gnosis",
    currencies: [Currency.eur],
    query: {
      enabled: !!currentAddress,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      retry: 2,
      staleTime: 30000,
    },
  });

  if (profileLoading || addressLoading || balanceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monerium Balance</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!profile || !addressResponse?.addresses?.[0]) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monerium Balance</CardTitle>
          <CardDescription>
            Please connect your Monerium account first
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const address = addressResponse?.addresses?.[0];
  const balance =
    balances && "balances" in balances ? balances.balances[0] : null;
  const amount = typeof balance?.amount === "number" ? balance.amount : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monerium Balance</CardTitle>
        <CardDescription>Your current EURe balance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">€{amount.toFixed(2)}</div>
          {address && (
            <>
              <div className="text-sm text-muted-foreground">
                Address: {address.address}
              </div>
              <div className="text-sm text-muted-foreground">
                Network: {address.chains.join(", ")}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
