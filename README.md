# 

A modern web application for viewing and managing crypto invoicing and EUR offramps through Monerium. Built with React, TypeScript, and Vite.

## Features

- 📊 Financial Dashboard with real-time metrics
- 💶 Multi-currency support (EUR, USD, CHF)
- 🏦 Monerium integration for EUR offramps
- 📱 Responsive design
- 💾 Offline-capable with local database
- 📤 Export/Import functionality for data backup

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- A Monerium account and API credentials

## Getting Started

1. Clone the repository:
2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your Monerium credentials:
```
VITE_MONERIUM_CLIENT_ID=your-client-id
VITE_MONERIUM_REDIRECT_URI=http://localhost:5173
```

4. Start the development server:
```bash
pnpm dev
```

## Configuration

### Monerium Setup

1. Create a Monerium account at [monerium.com](https://monerium.app)
2. Get your API credentials from the developer dashboard
3. Add them to your `.env` file

### Database

The application uses an in-browser database (Dexie.js) to store:
- Invoices
- Expenses
- Monerium transactions
- Monthly/Yearly summaries

Data can be exported/imported using the built-in tools in the dashboard.

## Usage

### Invoicing

1. Navigate to the Invoices section
2. Create new invoices with support for multiple currencies (CHF, USD, EUR)
3. All amounts are converted to EUR using current exchange rates

### Monerium Integration

1. Connect your Monerium account through the dashboard
2. View your EURe balance
3. Track offramp transactions
4. Export transaction history

### Data Management

- Use the Export function to backup your data
- Import previously exported data
- Merge new data with existing records

## Security

- The application runs entirely in your browser
- No sensitive data is sent to external servers

## Development

### Project Structure
```
src/
  ├── components/     # React components
  ├── db/            # Database configuration
  ├── lib/           # Utilities and helpers
  ├── types/         # TypeScript type definitions
  └── App.tsx        # Main application component
```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- Built as a demonstration of what can be achieved when coding with Cursor + Sonnet 3.5 in a very
short amount of time. No code was written by hand.
- Built with [shadcn/ui](https://ui.shadcn.com/)
- [Monerium](https://monerium.com) for EUR offramp capabilities
- [Dexie.js](https://dexie.org) for the in-browser database

## Support

Provided as is. No support provided. You can open issues in the GitHub repository.
