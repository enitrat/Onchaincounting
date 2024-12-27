import React from "react";
import { useAuth } from "@monerium/sdk-react-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BalanceDisplay } from "./monerium/BalanceDisplay";
import { OrdersDisplay } from "./monerium/OrdersDisplay";
import { useMoneriumSyncStatus } from "@/db/db";
import { Badge } from "@/components/ui/badge";

export function Monerium() {
  const {
    authorize,
    isAuthorized,
    isLoading: authLoading,
    error: authError,
  } = useAuth();
  const syncStatus = useMoneriumSyncStatus();

  const handleConnect = React.useCallback(() => {
    authorize();
  }, [authorize]);

  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monerium</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // If we have local data but no auth, show offline mode
  if (!isAuthorized && syncStatus.hasLocalData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Monerium (Offline Mode)</CardTitle>
                <CardDescription>Viewing locally stored data</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Last synced:{" "}
                  {syncStatus.lastSynced
                    ? new Date(syncStatus.lastSynced).toLocaleDateString()
                    : "Never"}
                </Badge>
                <Button onClick={handleConnect}>Connect & Sync</Button>
              </div>
            </div>
          </CardHeader>
        </Card>
        <OrdersDisplay />
      </div>
    );
  }

  if (authError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monerium</CardTitle>
          <CardDescription>Authentication Error</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {authError instanceof Error
                ? authError.message
                : "Authentication failed"}
            </AlertDescription>
          </Alert>
          <Button onClick={handleConnect} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monerium</CardTitle>
          <CardDescription>
            Connect your Monerium account to manage your EURe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>Connect Monerium</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monerium (Connected)</CardTitle>
              <CardDescription>
                Live data from your Monerium account
              </CardDescription>
            </div>
            <Badge variant="default">
              Synced:{" "}
              {syncStatus.lastSynced
                ? new Date(syncStatus.lastSynced).toLocaleDateString()
                : "Never"}
            </Badge>
          </div>
        </CardHeader>
      </Card>
      <BalanceDisplay />
      <OrdersDisplay />
    </div>
  );
}
