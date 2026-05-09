# Apex Rentals Management Solution - Backend

A multi-tenant Rental Management system built with Node.js, Express, and PostgreSQL.

## Features
- **Multi-Tenancy:** Isolated data schemas per landlord/organization.
- **Tenant Onboarding:** Inquiry and approval workflow with automated temporary password generation.
- **Payments:** Direct-to-Landlord M-Pesa integration and Paystack for platform subscriptions.
- **Messaging:** Property-specific and portfolio-wide community chats.
- **Maintenance:** Repair requests with image uploads and status tracking.
- **Automation:** Automated rent reminders and billing cycles.

## Local Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- Paystack Account (for subscriptions)
- Safaricom Daraja Account (for M-Pesa)
- Gemini API Key (for AI reminders)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (use `.env.example` as a template).

### Database Configuration
Ensure PostgreSQL is running and create a database named `apex_rentals`.
Run the startup command to automatically apply public migrations:
```bash
npm start
```

### Seeding Test Data
To quickly start testing, run the super admin seed:
```bash
npm run seed:admin
```

## API Documentation
Detailed API documentation can be found in [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md).

## Running with Docker
```bash
docker build -t apex-backend .
docker run -p 5000:5000 --env-file .env apex-backend
```

## Testing with Postman
1. Import the collection from `docs/Apex_Agencies.postman_collection.json`.
2. Set the `baseUrl` variable to `http://localhost:5000/api`.
3. Use the login endpoint to get a token and set it as a Bearer token for other requests.
