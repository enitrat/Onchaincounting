import pdfToText from "react-pdftotext";

interface ExtractedInvoiceData {
  invoiceNumber?: string;
  afterTaxAmount?: number;
  beforeTaxAmount?: number;
  currency?: "USD" | "CHF";
  vatRate?: number;
  exchangeRate?: number;
  date?: Date;
  clientName?: string;
}

function extractCurrencyAndAmount(text: string): {
  amount?: number;
  currency?: "USD" | "CHF";
} {
  const patterns = [
    // Onlydust
    /Total After Tax\s*([\d,]+\.?\d*)\s*([A-Z]{3})/i,

    // Request Finance
    /Total Amount\s*([A-Z]{3})\s*([\d,]+\.?\d*)/i,
    /Total Amount\s*([\d,]+\.?\d*)\s*([A-Z]{3})/i,
    /Total Amount\s*\$\s*([\d,]+\.?\d*)/i, // Dollar sign format

    // Personal old format
    /Total gross price\s*([\d\s,]+(?:\.\s?\d*)?)\s*([A-Z]{3})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    console.log(match);
    if (match) {
      try {
        // Handle dollar sign pattern first
        if (pattern.toString().includes("\\$")) {
          const amount = parseFloat(match[1].replace(/[,\s]/g, ""));
          return { amount, currency: "USD" };
        }

        // Check if match[1] is the currency or amount
        const isCurrencyFirst = /^[A-Z]{3}$/.test(match[1]);
        const amount = parseFloat(
          (isCurrencyFirst ? match[2] : match[1]).replace(/[,\s]/g, ""),
        );
        const currency = (
          isCurrencyFirst ? match[1] : match[2]
        ).toUpperCase() as "USD" | "CHF";
        console.log(amount, currency);

        if (currency === "USD" || currency === "CHF") {
          return { amount, currency };
        }
      } catch (error) {
        console.error("Error parsing amount and currency:", error);
      }
    }
  }
  return {};
}

function extractExchangeRate(text: string): number {
  const eurUsdPattern = /EUR\/USD[:\s]+([\d.]+)/i;
  const eurChfPattern = /EUR\/CHF=([\d.]+)/i;
  const usdEurPattern = /1\s*USD\s*=\s*([\d.]+)\s*EUR/i;

  const eurUsdMatch = text.match(eurUsdPattern);
  const eurChfMatch = text.match(eurChfPattern);
  const usdEurMatch = text.match(usdEurPattern);

  if (eurUsdMatch?.[1]) return parseFloat(eurUsdMatch[1]);
  if (eurChfMatch?.[1]) return parseFloat(eurChfMatch[1]);
  if (usdEurMatch?.[1])
    return parseFloat((1 / parseFloat(usdEurMatch[1])).toFixed(4));
  return 0;
}

export async function extractInvoiceData(
  file: File,
): Promise<ExtractedInvoiceData> {
  try {
    const extractedText = await pdfToText(file);
    console.log(extractedText);
    const { amount: afterTaxAmount, currency } =
      extractCurrencyAndAmount(extractedText);

    return {
      invoiceNumber: extractInvoiceNumber(extractedText),
      afterTaxAmount,
      beforeTaxAmount: extractBeforeTaxAmount(extractedText),
      currency,
      vatRate: extractVatRate(extractedText),
      exchangeRate: extractExchangeRate(extractedText),
      date: extractDate(extractedText),
      clientName: extractClientName(extractedText),
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF");
  }
}

function extractInvoiceNumber(text: string): string | undefined {
  // Common invoice number patterns
  const patterns = [
    /INVOICE NO:\s*#([A-Z0-9-]+)/i,
    /Invoice #(\d+)/i,
    /Invoice No\.:\s*(\d+\s*\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function extractBeforeTaxAmount(text: string): number | undefined {
  // Look for any currency amount patterns. After tax says what currency is used
  const patterns = [
    // Onlydust
    /Total Before Tax\s*([\d,]+\.?\d*)\s*/i,
    // Request Finance
    /Total without Tax\s*(?:CHF)?\s*([\d,]+\.?\d*)\s*/i,
    /Total without Tax\s*\$\s*([\d\s,]+(?:\.\d+)?)/,
    // Perso
    /Total net price\s*([\d\s,]+(?:\.\d+)?)\s*USD/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return parseFloat(match[1].replace(/[,\s]/g, ""));
  }
  return undefined;
}

function extractVatRate(text: string): number | undefined {
  // Look for VAT rate patterns
  const patterns = [/Total VAT\s*\((\d+(?:\.\d+)?)\s*%\)/i, /VAT\s+(\d+)%/i];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return parseFloat(match[1]);
  }
  return undefined;
}

function extractDate(text: string): Date | undefined {
  // Common date patterns
  const patterns = [
    /Issue Date\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i, // Matches "Issue Date Dec 22, 2024" or "Issue Date Dec 22 2024"
    /Date[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /Invoice Date[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /Issued on:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i, // Matches "Issued on: June 25, 2024"
    /Issue Date:\s*(\d{1,2}\s*\d?\s*\/\s*\d{1,2}\s*\d?\s*\/\s*\d{2,4}\s*\d?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    console.log(match);
    if (match?.[1]) {
      const dateString = match[1].replace(/[\s]/g, "");

      // Special case for DD/MM/YYYY format
      if (dateString.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/)) {
        const [day, month, year] = dateString.split(/[-/]/).map(Number);
        const date = new Date(year, month - 1, day); // month is 0-based in JS Date
        if (!isNaN(date.getTime())) return date;
      }

      // For Month DD, YYYY format
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return undefined;
}

function extractClientName(text: string): string | undefined {
  // Look for client/bill to sections
  const patterns = [
    /Billed to\s*([A-Za-z0-9\s]+)(?:\n|[\d])/i,
    /Bill To:?\s*([A-Za-z0-9\s.,]+)(?:\n|Invoice)/i,
    /Client:?\s*([A-Za-z0-9\s.,]+)(?:\n|Invoice)/i,
    /Billed to\s*(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*([A-Za-z0-9\s]+?(?:\s{2}|\n|$))/i, // Matches email followed by company name, stopping at double space or newline
    /Buyer\s*([\w\s]+)(?:\n|[\d])/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}
