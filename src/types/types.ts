/**
 * Represents a cryptocurrency used in the system
 */
export type CryptoCurrency = 'USDC' | 'STRK' | 'EURe';

/**
 * Represents a blockchain network
 */
export type BlockchainNetwork = 'starknet' | 'gnosis';

/**
 * Represents an invoice in the system
 */
export interface Invoice {
    id: string;
    date: Date;
    invoiceNumber: string;
    clientName: string;
    // Native currency amounts
    beforeTaxAmount: number;
    afterTaxAmount: number;
    vatRate: number;
    vatAmount: number;
    currency: Currency;
    // EUR converted amounts (for accounting)
    beforeTaxEurAmount: number;
    afterTaxEurAmount: number;
    vatEurAmount: number;
    // Exchange rate at invoice time (EUR/CURRENCY)
    exchangeRate: number;
    cryptoPayments: {
        amount: number;
        currency: CryptoCurrency;
        network: BlockchainNetwork;
    }[];
    pdfPath?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Categories for business expenses
 */
export type ExpenseCategory =
    | 'software'
    | 'hardware'
    | 'subscription'
    | 'service'
    | 'other';

/**
 * Represents a business expense
 */
export interface Expense {
    id: string;
    date: Date;
    category: ExpenseCategory;
    description: string;
    amount: number;
    currency: 'USD' | 'EUR';
    vatDeductible: boolean;
    receipt?: string; // Path to receipt file
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Represents a withdrawal operation through Monerium
 */
export interface Withdrawal {
    id: string;
    date: Date;
    sourceAmount: number;
    sourceCurrency: CryptoCurrency;
    sourceNetwork: BlockchainNetwork;
    targetAmount: number; // Final EUR amount
    exchangeRate: number;
    transactionHash?: string;
    status: 'pending' | 'completed' | 'failed';
    moneuriumReference?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Monthly summary of financial activities
 */
export interface MonthlySummary {
    year: number;
    month: number; // 1-12
    // Native currency totals
    totalInvoicedUsd: number;
    totalInvoicedChf: number;
    // EUR converted totals (for accounting)
    totalInvoicedEur: number;
    totalVatCollectedEur: number;
    totalExpensesEur: number;
    totalWithdrawalsEur: number;
    profitLossEur: number;
}

/**
 * Yearly summary of financial activities
 */
export interface YearlySummary {
    year: number;
    monthlySummaries: MonthlySummary[];
    // Native currency totals
    totalInvoicedUsd: number;
    totalInvoicedChf: number;
    // EUR converted totals (for accounting)
    totalInvoicedEur: number;
    totalVatCollectedEur: number;
    totalExpensesEur: number;
    totalWithdrawalsEur: number;
    profitLossEur: number;
}

export type Currency = 'USD' | 'CHF';
