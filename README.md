# FinAudit AI

FinAudit AI is a Multimodal Universal Financial Auditor designed to ingest, parse, and analyze financial documents across various formats (PDF, Excel, CSV, Images). It provides instant, professional-grade audits with a focus on AML (Anti-Money Laundering) compliance.

## Features

- **Format Agnostic Parsing:** Upload messy Excel sheets, CSVs, PDFs, or even images of receipts. The system automatically extracts the relevant financial data.
- **Universal Currency Normalization:** Automatically detects currencies (USD, EUR, GBP, PKR, BHD, QAR, etc.) and converts all values to BHD (Bahraini Dinar) based on 2026 exchange rates for standardized analysis.
- **AML Anomaly Detection:** Identifies "Red Flags" such as structuring (smurfing), rapid movement of funds, and profile mismatches.
- **Automated Summaries:** Generates a comprehensive "Summary of Financial Health and Risk" with a clear risk rating (Low, Medium, High).

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Running the Application

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Technologies Used

- React 18
- TypeScript
- Tailwind CSS
- Google Gemini API (gemini-3-flash-preview)
- XLSX (for Excel/CSV parsing)
- Lucide React (Icons)
- Framer Motion (Animations)

## License

MIT License
