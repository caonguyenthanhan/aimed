# Environment Variables Setup

## Getting Started

Copy the `.env.sample` file to `.env.local` and fill in the required values:

```powershell
Copy-Item .env.sample .env.local
```

## Configuration

### Gemini API Configuration

1. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add it to your `.env.local`:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### Database Configuration

Configure your PostgreSQL connection string (recommended: Neon/Vercel Postgres variables):

```
POSTGRES_URL=postgresql://user:password@host:port/database_name
```

Fallback (if you use a single DSN):

```
DATABASE_URL=postgresql://user:password@host:port/database_name
```

For a complete list of supported variables and provider routing, see `docs/ENV_GUIDE.md`.

## Features

### Enhanced Agent Experience

The application now includes a confirmation dialog before navigating to other pages. This gives users time to read the consultation results before moving to:
- Screening programs (`/sang-loc`)
- Therapy programs (`/tri-lieu`)
- Reminders (`/nhac-nho`)
- Other navigation paths

This prevents the agent from jumping too quickly without giving users time to review the content.

### Testing Locally

After setting up your environment variables:

```powershell
npm install
npm run dev
```

Visit `http://localhost:3000` and navigate to `/tu-van` to test the consultation chat with confirmation dialogs.
