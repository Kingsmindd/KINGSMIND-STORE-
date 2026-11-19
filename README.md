# KINGSMIND Store

KINGSMIND is a football gear store built with React, TypeScript, Express, and PostgreSQL. Customers can browse products, combine NGN and USD listings in one checkout, and pay in naira on delivery. The admin dashboard handles products, delivery quotes, orders, exchange rates, and support conversations.

## Run locally

The setup was tested with Node.js 24 and PostgreSQL 18.

From the project root, create a fresh database and load the schema:

```powershell
createdb --host localhost --port 5432 --username postgres kingsmind_store
psql --host localhost --port 5432 --username postgres --dbname kingsmind_store --set ON_ERROR_STOP=on --single-transaction --file "server/schema.sql"
```

Create the local configuration files:

```powershell
Copy-Item .\server\.env.example .\server\.env
Copy-Item .\client\.env.example .\client\.env
```

Set the PostgreSQL connection details in `server/.env`. Generate a session secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and use the output as `SESSION_SECRET`. Configure the Brevo settings to test account and support emails.

Start the API in one terminal:

```powershell
cd server
npm ci
npm run dev
```

Start the frontend in a second terminal, from the project root:

```powershell
cd client
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Try the demo

The schema sets up an empty store. Register a customer account and a separate account for admin testing. In your local database, grant admin access to that second account by replacing the example address below with the one you registered:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-local-admin@example.com';
```

Sign out and back in after changing the role.

1. **As admin**, create and publish one NGN product and one USD product. Set a demo USD-to-NGN rate in **Exchange rate**.
2. **As a verified customer**, add both items, save and resume the cart, and place an order. Checkout shows the converted line totals and a single NGN subtotal.
3. **As admin**, add an NGN delivery quote, confirm the order, mark it shipped, and record payment on delivery.
4. **As a guest in a private window**, send a support message. Reply from the admin inbox and check the chat, read receipt, and email notification.

### Try the customer demo

Email: umehjnor0041@gmail.com
Password: demoaccount12345

Use this account to explore the cart, checkout, and order history.
The store is a portfolio demonstration. Orders are not fulfilled.

## Checks

```powershell
npm --prefix server run typecheck
npm --prefix client run lint
npm --prefix client run build
```
