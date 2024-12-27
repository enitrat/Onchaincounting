import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Invoice,
  CryptoCurrency,
  BlockchainNetwork,
  Currency,
} from "../types/types";
import { extractInvoiceData } from "../utils/pdfParser";
import { db, generateId } from "../db/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const cryptoPaymentSchema = z.object({
  amount: z.number().min(0),
  currency: z.enum(["USDC", "STRK", "EURe"] as const),
  network: z.enum(["starknet", "gnosis"] as const),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  date: z.date(),
  clientName: z.string().min(1, "Client name is required"),
  currency: z.enum(["USD", "CHF"] as const),
  afterTaxAmount: z.number().min(0),
  beforeTaxAmount: z.number().min(0),
  // Always EUR / CURRENCY
  exchangeRate: z.number().min(0),
  vatRate: z.number().min(0).max(100),
  cryptoPayments: z.array(cryptoPaymentSchema).default([]),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Props {
  onSuccess?: () => void;
  initialData?: Partial<Invoice>;
}

export function InvoiceForm({ onSuccess, initialData }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      ...initialData,
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      cryptoPayments: initialData?.cryptoPayments || [],
    },
  });

  const [pdfUploading, setPdfUploading] = React.useState(false);
  const [cryptoPayments, setCryptoPayments] = React.useState<
    Array<{
      amount: number;
      currency: CryptoCurrency;
      network: BlockchainNetwork;
    }>
  >(initialData?.cryptoPayments || []);

  const handlePDFUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfUploading(true);
    try {
      const extractedData = await extractInvoiceData(file);
      const vatRate =
        extractedData.vatRate ??
        (extractedData.afterTaxAmount && extractedData.beforeTaxAmount
          ? Math.ceil(
              (extractedData.afterTaxAmount / extractedData.beforeTaxAmount -
                1) *
                100,
            )
          : undefined);

      if (extractedData.invoiceNumber) {
        setValue("invoiceNumber", extractedData.invoiceNumber);
      }
      if (extractedData.afterTaxAmount) {
        setValue("afterTaxAmount", extractedData.afterTaxAmount);
      }
      if (extractedData.beforeTaxAmount) {
        setValue("beforeTaxAmount", extractedData.beforeTaxAmount);
      }
      if (vatRate) {
        setValue("vatRate", vatRate);
      }
      if (extractedData.currency) {
        setValue("currency", extractedData.currency);
      }
      if (extractedData.exchangeRate) {
        setValue("exchangeRate", extractedData.exchangeRate);
      }
      if (extractedData.date) {
        setValue("date", extractedData.date);
      }
      if (extractedData.clientName) {
        setValue("clientName", extractedData.clientName);
      }
      toast.success("PDF data extracted successfully");
    } catch (error) {
      console.error("Error parsing PDF:", error);
      toast.error("Failed to parse PDF. Please check the file format.");
    } finally {
      setPdfUploading(false);
    }
  };

  const handleAddCryptoPayment = () => {
    setCryptoPayments([
      ...cryptoPayments,
      { amount: 0, currency: "USDC", network: "gnosis" },
    ]);
  };

  const handleRemoveCryptoPayment = (index: number) => {
    setCryptoPayments(cryptoPayments.filter((_, i) => i !== index));
  };

  const handleCryptoPaymentChange = (
    index: number,
    field: keyof (typeof cryptoPayments)[0],
    value: string | number,
  ) => {
    const newPayments = [...cryptoPayments];
    if (field === "amount") {
      newPayments[index].amount = Number(value);
    } else if (field === "currency") {
      newPayments[index].currency = value as CryptoCurrency;
    } else if (field === "network") {
      newPayments[index].network = value as BlockchainNetwork;
    }
    setCryptoPayments(newPayments);
    setValue("cryptoPayments", newPayments);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    console.log("Attempting submit...");
    console.log("Form data:", data);
    try {
      const exchangeRate = data.exchangeRate;
      const toEur = 1 / exchangeRate;
      const vatAmount = data.afterTaxAmount - data.beforeTaxAmount;

      const invoice: Invoice = {
        id: initialData?.id || generateId(),
        date: data.date,
        invoiceNumber: data.invoiceNumber,
        clientName: data.clientName,
        beforeTaxAmount: data.beforeTaxAmount,
        afterTaxAmount: data.afterTaxAmount,
        vatRate: data.vatRate,
        vatAmount,
        currency: data.currency,
        beforeTaxEurAmount: data.beforeTaxAmount * toEur,
        afterTaxEurAmount: data.afterTaxAmount * toEur,
        vatEurAmount: vatAmount * toEur,
        exchangeRate,
        cryptoPayments,
        notes: data.notes,
        createdAt: initialData?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      await db.invoices.put(invoice);
      toast.success(
        initialData
          ? "Invoice updated successfully"
          : "Invoice created successfully",
      );
      onSuccess?.();
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save invoice. Please try again.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errors) => {
        console.log("Form validation errors:", errors);
        toast.error("Please check the form for errors");
      })}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <Label>Upload Invoice PDF</Label>
          <Input
            type="file"
            accept=".pdf"
            onChange={handlePDFUpload}
            disabled={pdfUploading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input {...register("invoiceNumber")} placeholder="INV-001" />
            {errors.invoiceNumber && (
              <Alert variant="destructive">
                <AlertDescription>
                  {errors.invoiceNumber.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="text" {...register("date", { valueAsDate: true })} />
            {errors.date && (
              <Alert variant="destructive">
                <AlertDescription>{errors.date.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Client Name</Label>
          <Input {...register("clientName")} placeholder="Client name" />
          {errors.clientName && (
            <Alert variant="destructive">
              <AlertDescription>{errors.clientName.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={watch("currency")}
              onValueChange={(value) => setValue("currency", value as Currency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CHF">CHF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Exchange Rate</Label>
            <Input
              type="number"
              step="0.0001"
              {...register("exchangeRate", { valueAsNumber: true })}
              placeholder="1.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Before Tax Amount</Label>
            <Input
              type="number"
              step="0.01"
              {...register("beforeTaxAmount", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>After Tax Amount</Label>
            <Input
              type="number"
              step="0.01"
              {...register("afterTaxAmount", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>VAT Rate</Label>
            <Input
              type="number"
              step="0.01"
              {...register("vatRate", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <Label>Crypto Payments</Label>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCryptoPayment}
                size="sm"
              >
                Add Payment
              </Button>
            </div>
            <div className="space-y-4">
              {cryptoPayments.map((payment, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="number"
                    step="0.000001"
                    value={payment.amount}
                    onChange={(e) =>
                      handleCryptoPaymentChange(index, "amount", e.target.value)
                    }
                    placeholder="Amount"
                    className="w-1/3"
                  />
                  <Select
                    value={payment.currency}
                    onValueChange={(value) =>
                      handleCryptoPaymentChange(index, "currency", value)
                    }
                  >
                    <SelectTrigger className="w-1/3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="STRK">STRK</SelectItem>
                      <SelectItem value="EURe">EURe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={payment.network}
                    onValueChange={(value) =>
                      handleCryptoPaymentChange(index, "network", value)
                    }
                  >
                    <SelectTrigger className="w-1/3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starknet">Starknet</SelectItem>
                      <SelectItem value="gnosis">Gnosis</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemoveCryptoPayment(index)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            {...register("notes")}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Saving..."
          : initialData
            ? "Update Invoice"
            : "Create Invoice"}
      </Button>
    </form>
  );
}
