import React from "react";
import { exportDatabase, importDatabase } from "../db/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";

export function DatabaseActions() {
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      await exportDatabase();
      toast.success("Database exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export database");
    }
  };

  const handleImport = async (merge: boolean = false) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      await importDatabase(file, merge);
      toast.success(
        merge
          ? "Database merged successfully"
          : "Database imported successfully",
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to import database",
      );
      toast.error("Failed to import database");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Management</CardTitle>
        <CardDescription>
          Import and export your accounting data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Export Database</Label>
          <div>
            <Button onClick={handleExport} variant="outline">
              Export to JSON
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Download your complete database as a JSON file
          </p>
        </div>

        <div className="space-y-2">
          <Label>Import Database</Label>
          <div className="flex flex-col gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              disabled={importing}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleImport(false)}
                variant="default"
                disabled={importing}
              >
                {importing ? "Importing..." : "Replace Current Data"}
              </Button>
              <Button
                onClick={() => handleImport(true)}
                variant="outline"
                disabled={importing}
              >
                Merge with Current Data
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Import a previously exported database file
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
