# Welcome to LMS

**Product**: Prepnow LMS

## How can I edit this code?

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS


In this LMS, Have three plateform.
/home - Main Plateform
/jr -  For Junior Student
/selfpaced - For Self Paced Student

## Orange PG UAT

Orange PG is an optional UAT-only payment initiation path for Main, Junior, and Self-Paced checkout. Existing Razorpay checkout remains the default. Do not enable Orange PG outside UAT.

The frontend option is hidden unless `VITE_ORANGE_PG_UAT_ENABLED=true` is set in the app environment. Configure these Supabase Edge Function secrets separately:

- `ORANGE_PG_UAT_ENABLED=true`
- `ORANGE_PG_INITIATE_URL` (ICICI UAT initiate-sale endpoint)
- `ORANGE_PG_MERCHANT_ID`
- `ORANGE_PG_AGGREGATOR_ID`
- `ORANGE_PG_SECURE_KEY` (server-side secret only; never put it in a `VITE_` variable)
- `ORANGE_PG_RETURN_URL` (the return URL ICICI has registered for this UAT merchant)
- `ORANGE_PG_HASH_MODE` (`sha256-prefix`, `sha256-suffix`, or `hmac-sha256`)

The exact hash mode and return URL must be confirmed against ICICI's integration instructions before UAT use. The hash modes are implementation options, not a claim that any one is the bank-approved formula.

At present, Orange PG initiation and redirect are implemented, and payment attempts are recorded in `orange_pg_payment_attempts`. The payment-result callback, bank response-hash verification, and status-enquiry flow are intentionally not implemented because the supplied UAT email does not specify their format. Returning from the gateway will therefore not mark an enrollment/order paid or grant access. Complete those steps only after obtaining ICICI's callback/status contract. Main-platform coupon payments are currently excluded from Orange PG UAT; Self-Paced coupons continue through the server-side order calculation.
