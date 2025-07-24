# Auto Quote

An AI-powered business management application that automates invoice and quote generation using natural language processing.

## Features

- **AI-Powered Document Creation**: Input unstructured text and automatically generate professional invoices and quotes
- **Client Management**: Store and manage client information with automatic matching
- **Product Catalog**: Maintain a database of products and services with pricing
- **Document Generation**: Export invoices and quotes as PDF or DOCX files
- **Status Tracking**: Track invoice status (draft, sent, paid, overdue, canceled) and quote status (draft, sent, accepted, rejected, expired)
- **Professional Templates**: Customizable branded templates for business documents

## How It Works

Simply describe your business transaction in natural language:
> "Create an invoice for ABC Corp for website design work, 40 hours at $100/hour"

The AI will automatically:
- Extract client, product, and pricing information
- Match existing clients and products or create new ones
- Generate a professional, structured document
- Calculate totals, taxes, and formatting

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Shadcn/ui, Framer Motion
- **Backend**: Next.js Server Actions, PostgreSQL, Drizzle ORM
- **AI**: OpenAI GPT-4o-mini for text processing
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Document Generation**: jsPDF, docx
- **Analytics**: PostHog

## Prerequisites

You will need accounts for the following services (all have free tiers):

- [Supabase](https://supabase.com/) - Database
- [Clerk](https://clerk.com/) - Authentication
- [OpenAI](https://openai.com/) - AI processing
- [PostHog](https://posthog.com/) - Analytics (optional)
- [Vercel](https://vercel.com/) - Deployment (optional)

## Environment Variables

```bash
# Database (Supabase)
DATABASE_URL=

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# AI (OpenAI)
OPENAI_API_KEY=

# Analytics (PostHog) - Optional
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in the environment variables
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up the database:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
