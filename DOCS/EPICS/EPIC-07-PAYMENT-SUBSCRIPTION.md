# EPIC-07: Payment & Subscription Management

## Epic Overview
Implement a comprehensive payment and subscription management system with Razorpay and Stripe integration, supporting multiple pricing plans, job posting payments, invoicing, and subscription lifecycle management.

---

## Business Value
- Generate revenue through job postings and subscriptions
- Enable flexible pricing models for different markets
- Provide transparent billing and invoicing
- Support international payments
- Ensure PCI-DSS compliance and payment security

---

## User Stories

### US-07.1: Subscription Plans Setup
**As a** platform administrator
**I want to** create and manage subscription plans
**So that** employers can choose plans that fit their needs

**Acceptance Criteria:**
- Admin dashboard for plan management
- Create subscription plans with:
  - Plan name (Free, Basic, Premium, Enterprise)
  - Plan type (Job posting credits, Resume access, Featured listings)
  - Pricing (one-time or recurring)
  - Billing cycle (Monthly, Quarterly, Yearly)
  - Currency (INR, USD, EUR, etc.)
  - Plan features:
    - Number of job posts per month
    - Resume database access (downloads/month)
    - Featured job slots
    - Highlighted job posts
    - Team members allowed
    - Advanced analytics access
    - Priority support
    - Job boost/promotion
  - Plan validity (days)
  - Auto-renewal option

- Plan comparison table for users
- Free tier with limitations
- Trial period option (e.g., 14 days)
- Plan visibility (active/hidden)
- Discount management:
  - Percentage discount
  - Fixed amount discount
  - Validity period
  - Applicable plans
- Promotional codes/coupons
- Multi-region pricing support
- Plan upgrade/downgrade paths

---

### US-07.2: View Subscription Plans (Employer)
**As an** employer
**I want to** view available subscription plans
**So that** I can choose the best plan for my needs

**Acceptance Criteria:**
- Pricing page with plan comparison
- Plan cards showing:
  - Plan name and tagline
  - Price (monthly/yearly toggle)
  - Save percentage for yearly billing
  - Feature list with checkmarks
  - "Most Popular" badge
  - "Current Plan" indicator
  - CTA button (Subscribe/Upgrade/Contact Sales)

- Interactive pricing calculator:
  - Number of job posts needed
  - Team size
  - Calculate recommended plan
  - Show cost breakdown

- FAQ section:
  - Payment methods accepted
  - Refund policy
  - Plan change policy
  - Auto-renewal details

- Filter by:
  - Billing cycle
  - Job posting volume
  - Team size

- Compare plans side-by-side
- "Contact Sales" for Enterprise plan
- Testimonials and reviews
- Money-back guarantee badge
- Secure payment badges (SSL, PCI-DSS)

---

### US-07.3: Subscribe to Plan
**As an** employer
**I want to** subscribe to a plan
**So that** I can access premium features

**Acceptance Criteria:**
- Click "Subscribe" on plan card
- Subscription checkout flow:
  - Plan summary (name, price, features)
  - Billing cycle selection
  - Apply discount code (optional)
  - Review order:
    - Plan price
    - Discount applied
    - Tax (GST/VAT/Sales Tax)
    - Total amount
  - Accept terms and conditions
  - Proceed to payment

- Payment gateway selection:
  - Razorpay (India)
  - Stripe (International)

- Razorpay payment methods:
  - Credit/Debit cards
  - UPI (GPay, PhonePe, Paytm)
  - Net Banking
  - Wallets (Paytm, Mobikwik)
  - EMI options

- Stripe payment methods:
  - Credit/Debit cards
  - Apple Pay
  - Google Pay
  - SEPA (Europe)

- Secure payment processing (PCI-DSS compliant)
- 3D Secure authentication
- Payment success confirmation page
- Auto-generate invoice (GST-compliant)
- Email invoice immediately
- Credits/features activated instantly
- Confirmation email with subscription details
- Subscription start date and renewal date
- Failed payment retry option

---

### US-07.4: One-Time Job Posting Payment
**As an** employer
**I want to** pay for individual job postings
**So that** I can post jobs without subscribing

**Acceptance Criteria:**
- Pay-per-job option available
- Job posting pricing tiers:
  - Standard Post (₹X for Y days)
  - Featured Post (₹X for Y days, highlighted)
  - Premium Post (₹X for Y days, featured + urgent badge)

- Add-ons available:
  - Extend job duration
  - Promote to homepage
  - Social media boost
  - Email blast to candidates

- Checkout flow:
  - Job details summary
  - Select posting tier
  - Select add-ons (optional)
  - Review pricing
  - Apply discount code
  - Calculate tax
  - Total amount
  - Payment gateway selection
  - Complete payment

- Job goes live immediately after payment
- Invoice generated and emailed
- Payment recorded in transaction history
- Job status changes to "Active"
- Employer dashboard updated

---

### US-07.5: Manage Subscription
**As an** employer
**I want to** manage my subscription
**So that** I can control my billing

**Acceptance Criteria:**
- Subscription management page showing:
  - Current plan details
  - Next billing date
  - Billing amount
  - Payment method on file
  - Subscription status (Active/Canceled/Expired)
  - Credits/features remaining:
    - Job posts left
    - Resume downloads left
    - Featured slots left
  - Usage statistics (current billing period)

- Actions available:
  - View subscription details
  - Change payment method
  - Update billing information
  - Upgrade plan
  - Downgrade plan (effective next cycle)
  - Cancel subscription
  - Enable/disable auto-renewal
  - View invoices
  - Download invoices

- Upgrade flow:
  - Select new plan
  - Show price difference (prorated)
  - Immediate upgrade option
  - Pay difference amount
  - Features activated instantly

- Downgrade flow:
  - Select lower plan
  - Confirm downgrade
  - Effective at end of current period
  - Warning about feature loss
  - Refund policy (if applicable)

- Cancel subscription:
  - Confirmation modal
  - Cancellation reason (optional survey)
  - Access until end of current period
  - Cancellation confirmation email
  - Option to reactivate before expiry

---

### US-07.6: Invoice Generation & Management
**As an** employer
**I want to** receive and download invoices
**So that** I can maintain financial records

**Acceptance Criteria:**
- Auto-generate invoice on payment
- GST-compliant invoice format (India):
  - Invoice number (unique, sequential)
  - Invoice date
  - Company details (seller):
    - Company name
    - GSTIN
    - Address
    - Contact
  - Customer details (buyer):
    - Company name
    - GSTIN (if provided)
    - Billing address
    - Contact email
  - Itemized list:
    - Plan/product name
    - Quantity
    - Unit price
    - Taxable amount
  - Tax breakdown:
    - CGST (%)
    - SGST (%)
    - IGST (if inter-state)
  - Total amount
  - Payment method
  - Transaction ID
  - Due date (for unpaid invoices)
  - Payment status (Paid/Pending)

- Invoice branding:
  - Company logo
  - Brand colors
  - Professional layout
  - Digital signature (optional)

- Invoice delivery:
  - Email as PDF attachment
  - Download from dashboard
  - View in browser

- Invoice history:
  - List all invoices
  - Filter by date, status
  - Search by invoice number
  - Download individual or bulk
  - Print-friendly format

- Invoice correction/reissue:
  - Request correction
  - Admin approval
  - Reissue with note

---

### US-07.7: Transaction History
**As an** employer
**I want to** view my transaction history
**So that** I can track all payments

**Acceptance Criteria:**
- Transaction history page showing:
  - Transaction ID
  - Date and time
  - Description (Plan name or Job posting)
  - Amount
  - Payment method
  - Status (Success/Failed/Pending/Refunded)
  - Invoice link
  - Receipt download

- Filter transactions:
  - Date range
  - Status
  - Payment method
  - Transaction type (Subscription/Job post/Add-on)

- Search by transaction ID or invoice number
- Sort by date (newest/oldest)
- Export to CSV or PDF
- Pagination or infinite scroll

- Transaction details view:
  - Full transaction information
  - Payment gateway response
  - Timestamp
  - IP address
  - Device information
  - Refund information (if applicable)

---

### US-07.8: Payment Method Management
**As an** employer
**I want to** manage my saved payment methods
**So that** I can update billing information

**Acceptance Criteria:**
- Payment methods page
- Add new payment method:
  - Credit/Debit card
  - Bank account (for auto-debit)
  - UPI ID (for recurring)

- Saved payment methods showing:
  - Card type (Visa/Mastercard/etc.)
  - Last 4 digits
  - Expiry date
  - Cardholder name
  - Default method indicator

- Actions:
  - Set as default
  - Edit billing address
  - Remove payment method
  - Verify card (small charge + refund)

- Security:
  - Tokenization (no raw card data stored)
  - PCI-DSS compliance
  - 3D Secure for transactions
  - CVV required for new charges

- Auto-update for expired cards (if supported by gateway)
- Email notification for:
  - Payment method added
  - Payment method removed
  - Card expiring soon
  - Failed auto-charge

---

### US-07.9: Auto-Renewal & Billing
**As an** employer
**I want** automatic subscription renewal
**So that** my service continues uninterrupted

**Acceptance Criteria:**
- Auto-renewal enabled by default
- Renewal process:
  - Charge default payment method
  - X days before renewal (attempt 1)
  - If failed, retry after 3 days (attempt 2)
  - If failed, retry after 7 days (attempt 3)
  - If all failed, suspend subscription

- Pre-renewal notification:
  - Email 7 days before renewal
  - Email 3 days before renewal
  - Reminder to update payment method if needed

- Successful renewal:
  - Payment confirmation email
  - Invoice generated and sent
  - Subscription extended
  - Credits refreshed

- Failed renewal:
  - Payment failed notification
  - Update payment method link
  - Grace period (e.g., 7 days)
  - Features disabled after grace period
  - Downgrade to free plan option

- Manage auto-renewal:
  - Toggle auto-renewal on/off
  - Confirmation required
  - Effective date displayed
  - Re-enable option

---

### US-07.10: Refund Processing
**As an** employer
**I want to** request a refund
**So that** I can get my money back if needed

**Acceptance Criteria:**
- Refund request option in transaction history
- Refund eligibility check:
  - Within refund window (e.g., 7 days)
  - Service not extensively used
  - Valid reason provided

- Refund request form:
  - Select transaction
  - Refund reason (dropdown + text)
  - Upload supporting documents (optional)
  - Submit request

- Admin review:
  - View refund request
  - Check eligibility
  - Approve or reject
  - Add notes

- Approved refund:
  - Process refund via payment gateway
  - Refund to original payment method
  - Partial or full refund
  - Refund confirmation email
  - Update transaction status
  - Deactivate subscription/credits

- Rejected refund:
  - Rejection email with reason
  - Appeal option

- Refund timeline:
  - 5-7 business days for cards
  - 3-5 business days for UPI/wallets
  - Status tracking

- Refund policy page:
  - Clear refund terms
  - Eligibility criteria
  - Processing time
  - Exceptions

---

### US-07.11: Discount Codes & Promotions
**As an** employer
**I want to** apply discount codes
**So that** I can save money on purchases

**Acceptance Criteria:**
- Discount code input at checkout
- Apply discount button
- Code validation:
  - Check if code exists
  - Check expiry date
  - Check usage limits
  - Check user eligibility
  - Check applicable plans/products

- Discount types:
  - Percentage off (e.g., 20% off)
  - Fixed amount off (e.g., ₹500 off)
  - Free trial extension
  - Free add-on (e.g., free featured post)

- Discount display:
  - Original price (strikethrough)
  - Discount amount
  - Final price (highlighted)
  - Savings amount

- Discount restrictions:
  - First-time users only
  - Specific plans only
  - Minimum purchase amount
  - One per customer
  - Cannot combine with other offers

- Invalid code handling:
  - Error message displayed
  - Reason (expired, invalid, already used)
  - Suggest valid codes (if available)

- Admin discount management:
  - Create discount codes
  - Set parameters (%, amount, duration)
  - Track usage analytics
  - Deactivate codes
  - Generate unique codes (bulk)

---

### US-07.12: Multi-Currency Support
**As a** platform
**I want to** support multiple currencies
**So that** international users can pay in local currency

**Acceptance Criteria:**
- Currency selection:
  - Auto-detect by user location
  - Manual currency selector
  - Remember preference

- Supported currencies:
  - INR (India)
  - USD (United States)
  - EUR (Europe)
  - GBP (United Kingdom)
  - AUD (Australia)
  - SGD (Singapore)
  - AED (UAE)

- Currency conversion:
  - Real-time exchange rates
  - Update daily
  - Display conversion rate
  - Base currency (USD or INR)

- Pricing display:
  - All prices in selected currency
  - Currency symbol (₹, $, €, £)
  - Format per locale (1,000.00 vs 1.000,00)

- Payment processing:
  - Charge in user's currency
  - Settle in platform's currency
  - Gateway handles conversion

- Invoice currency:
  - Invoice in charged currency
  - Show conversion details (optional)

- Tax calculation:
  - Tax rules per country
  - GST (India)
  - VAT (Europe)
  - Sales Tax (US states)

---

### US-07.13: Tax Compliance
**As a** platform
**I want to** handle tax calculations correctly
**So that** we comply with tax regulations

**Acceptance Criteria:**
- Tax calculation engine:
  - Determine tax jurisdiction
  - Calculate applicable taxes
  - Apply tax rules

- India (GST):
  - CGST + SGST (intra-state)
  - IGST (inter-state)
  - GST rate (18% for services)
  - GSTIN validation
  - Reverse charge mechanism (if applicable)

- Europe (VAT):
  - VAT rate per country
  - VAT MOSS (one-stop shop)
  - B2B vs B2C rules
  - VAT ID validation

- United States (Sales Tax):
  - Nexus determination
  - State/county/city rates
  - Tax-exempt entities

- Tax exemption:
  - Upload exemption certificate
  - Admin verification
  - Apply exemption to transactions

- Tax reporting:
  - Generate tax reports
  - Export for filing
  - Compliance dashboards

---

### US-07.14: Payment Analytics (Admin)
**As a** platform administrator
**I want to** view payment analytics
**So that** I can track revenue and trends

**Acceptance Criteria:**
- Payment analytics dashboard:
  - **Revenue Metrics:**
    - Total revenue (all time, MTD, YTD)
    - Revenue by plan type
    - Revenue by payment method
    - Revenue by region/country
    - Growth rate (MoM, YoY)

  - **Subscription Metrics:**
    - Active subscriptions
    - New subscriptions (period)
    - Canceled subscriptions
    - Churn rate
    - Renewal rate
    - Upgrade/downgrade rate
    - Average revenue per user (ARPU)
    - Lifetime value (LTV)

  - **Transaction Metrics:**
    - Total transactions
    - Successful transactions
    - Failed transactions
    - Refund rate
    - Average transaction value

  - **Payment Method Analysis:**
    - Distribution by method
    - Success rate by method
    - Popular methods per region

  - **Plan Performance:**
    - Most subscribed plans
    - Plan conversion rates
    - Plan retention rates

- Date range filters
- Comparison mode (current vs previous period)
- Export reports (CSV, PDF)
- Scheduled email reports
- Real-time dashboard updates
- Drill-down capabilities
- Predictive analytics (revenue forecast)

---

### US-07.15: Failed Payment Recovery
**As a** platform
**I want to** recover failed payments
**So that** we minimize revenue loss

**Acceptance Criteria:**
- Failed payment detection:
  - Capture failure reason
  - Categorize (card declined, insufficient funds, etc.)
  - Log attempt

- Retry logic:
  - Smart retry (avoid peak failure times)
  - Exponential backoff (1 day, 3 days, 7 days)
  - Max 3 retry attempts
  - Update payment method prompt

- User notifications:
  - Immediate email on failure
  - Retry notification
  - Final reminder before cancellation
  - Update payment method CTA

- Dunning management:
  - Grace period (7-14 days)
  - Feature restrictions during grace period
  - Downgrade to free plan option
  - Cancel subscription if unresolved

- Recovery campaigns:
  - Email sequence
  - In-app banners
  - SMS reminders (optional)
  - Incentives to update (discount)

- Analytics:
  - Failed payment rate
  - Recovery rate
  - Revenue recovered
  - Churn prevented

---

## Technical Requirements

### Payment Gateway Integration

**Razorpay (India):**
- API Key and Secret setup
- Webhook configuration
- Payment methods: Cards, UPI, NetBanking, Wallets
- Subscriptions API
- Invoices API
- Refunds API
- Payment links

**Stripe (International):**
- API Key and Secret setup
- Webhook configuration
- Payment methods: Cards, Apple Pay, Google Pay
- Subscription billing
- Invoice generation
- Refund processing
- SCA compliance (3D Secure)

### Database Schema

**Subscription Plans Table:**
```sql
subscription_plans (
  id: UUID PRIMARY KEY,
  name: VARCHAR(100),
  slug: VARCHAR(100) UNIQUE,
  description: TEXT,
  plan_type: ENUM('free', 'basic', 'premium', 'enterprise'),
  pricing_model: ENUM('one_time', 'recurring'),
  price: DECIMAL(10,2),
  currency: VARCHAR(3),
  billing_cycle: ENUM('monthly', 'quarterly', 'yearly'),
  features: JSONB,
  job_posts_per_month: INTEGER,
  resume_downloads_per_month: INTEGER,
  featured_job_slots: INTEGER,
  team_members_allowed: INTEGER,
  validity_days: INTEGER,
  trial_period_days: INTEGER,
  is_active: BOOLEAN DEFAULT true,
  sort_order: INTEGER,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**User Subscriptions Table:**
```sql
user_subscriptions (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  plan_id: UUID FOREIGN KEY REFERENCES subscription_plans(id),
  status: ENUM('active', 'canceled', 'expired', 'suspended'),
  payment_gateway: ENUM('razorpay', 'stripe'),
  gateway_subscription_id: VARCHAR(255),
  current_period_start: TIMESTAMP,
  current_period_end: TIMESTAMP,
  cancel_at_period_end: BOOLEAN DEFAULT false,
  canceled_at: TIMESTAMP,
  trial_start: TIMESTAMP,
  trial_end: TIMESTAMP,
  auto_renewal: BOOLEAN DEFAULT true,
  credits_remaining: JSONB,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Payments Table:**
```sql
payments (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  subscription_id: UUID FOREIGN KEY REFERENCES user_subscriptions(id),
  payment_gateway: ENUM('razorpay', 'stripe'),
  gateway_transaction_id: VARCHAR(255),
  payment_method: VARCHAR(50),
  amount: DECIMAL(10,2),
  currency: VARCHAR(3),
  tax_amount: DECIMAL(10,2),
  discount_amount: DECIMAL(10,2),
  total_amount: DECIMAL(10,2),
  status: ENUM('pending', 'success', 'failed', 'refunded'),
  failure_reason: VARCHAR(500),
  invoice_id: UUID FOREIGN KEY REFERENCES invoices(id),
  metadata: JSONB,
  paid_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

**Invoices Table:**
```sql
invoices (
  id: UUID PRIMARY KEY,
  invoice_number: VARCHAR(50) UNIQUE,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  payment_id: UUID FOREIGN KEY REFERENCES payments(id),
  billing_name: VARCHAR(255),
  billing_email: VARCHAR(255),
  billing_address: JSONB,
  gstin: VARCHAR(20),
  items: JSONB,
  subtotal: DECIMAL(10,2),
  tax_details: JSONB,
  discount_details: JSONB,
  total_amount: DECIMAL(10,2),
  currency: VARCHAR(3),
  status: ENUM('draft', 'paid', 'pending', 'void'),
  issued_at: TIMESTAMP,
  due_at: TIMESTAMP,
  paid_at: TIMESTAMP,
  pdf_url: VARCHAR(500),
  created_at: TIMESTAMP
)
```

**Discount Codes Table:**
```sql
discount_codes (
  id: UUID PRIMARY KEY,
  code: VARCHAR(50) UNIQUE,
  description: VARCHAR(255),
  discount_type: ENUM('percentage', 'fixed_amount'),
  discount_value: DECIMAL(10,2),
  currency: VARCHAR(3),
  applicable_plans: JSONB,
  min_purchase_amount: DECIMAL(10,2),
  max_usage_count: INTEGER,
  current_usage_count: INTEGER DEFAULT 0,
  valid_from: TIMESTAMP,
  valid_until: TIMESTAMP,
  is_active: BOOLEAN DEFAULT true,
  created_by: UUID FOREIGN KEY REFERENCES users(id),
  created_at: TIMESTAMP
)
```

---

## API Endpoints

```
# Subscription Plans
GET    /api/v1/plans                      - List all active plans
GET    /api/v1/plans/:id                  - Get plan details
POST   /api/v1/admin/plans                - Create plan (admin)
PUT    /api/v1/admin/plans/:id            - Update plan (admin)
DELETE /api/v1/admin/plans/:id            - Delete plan (admin)

# Subscriptions
POST   /api/v1/subscriptions              - Create subscription
GET    /api/v1/subscriptions              - Get user's subscriptions
GET    /api/v1/subscriptions/:id          - Get subscription details
PUT    /api/v1/subscriptions/:id/upgrade  - Upgrade subscription
PUT    /api/v1/subscriptions/:id/cancel   - Cancel subscription
PUT    /api/v1/subscriptions/:id/reactivate - Reactivate subscription

# Payments
POST   /api/v1/payments                   - Create payment
GET    /api/v1/payments                   - List user's payments
GET    /api/v1/payments/:id               - Get payment details
POST   /api/v1/payments/:id/refund        - Request refund

# Invoices
GET    /api/v1/invoices                   - List user's invoices
GET    /api/v1/invoices/:id               - Get invoice details
GET    /api/v1/invoices/:id/pdf           - Download invoice PDF
POST   /api/v1/invoices/:id/resend        - Resend invoice email

# Payment Methods
GET    /api/v1/payment-methods            - List saved payment methods
POST   /api/v1/payment-methods            - Add payment method
PUT    /api/v1/payment-methods/:id        - Update payment method
DELETE /api/v1/payment-methods/:id        - Remove payment method

# Discount Codes
POST   /api/v1/discounts/validate         - Validate discount code
POST   /api/v1/admin/discounts            - Create discount (admin)
GET    /api/v1/admin/discounts            - List all discounts (admin)
PUT    /api/v1/admin/discounts/:id        - Update discount (admin)

# Webhooks
POST   /api/v1/webhooks/razorpay          - Razorpay webhook
POST   /api/v1/webhooks/stripe            - Stripe webhook

# Analytics (Admin)
GET    /api/v1/admin/analytics/revenue    - Revenue analytics
GET    /api/v1/admin/analytics/subscriptions - Subscription analytics
```

---

## UI/UX Requirements

### Pricing Page
- Clean, modern design
- Plan comparison table
- Highlight recommended plan
- Monthly/yearly toggle
- Clear CTA buttons
- Trust badges (secure payment)
- FAQ section
- Mobile-responsive

### Checkout Page
- Progress indicator (steps)
- Order summary sidebar
- Discount code input
- Payment method icons
- Trust badges
- Loading states
- Error handling
- Success confirmation

### Subscription Dashboard
- Current plan card
- Usage statistics
- Next billing date
- Quick actions (upgrade, cancel)
- Transaction history table
- Invoice downloads

---

## Testing Requirements

### Unit Tests
- Tax calculation logic
- Discount code validation
- Proration calculations
- Currency conversion

### Integration Tests
- Razorpay payment flow
- Stripe payment flow
- Webhook processing
- Invoice generation
- Refund processing

### E2E Tests
- Complete subscription purchase
- Upgrade/downgrade flow
- Payment failure and retry
- Cancellation flow

### Security Tests
- PCI-DSS compliance
- SQL injection prevention
- XSS protection
- Payment data encryption

---

## Success Metrics

- Subscription conversion rate > 15%
- Payment success rate > 98%
- Churn rate < 5% monthly
- Average revenue per user (ARPU) growth
- Failed payment recovery rate > 40%
- Customer lifetime value (LTV) growth
- Upgrade rate > 20%

---

## Acceptance Criteria (Epic Level)

- [ ] Subscription plans can be created and managed
- [ ] Razorpay integration functional
- [ ] Stripe integration functional
- [ ] Subscription purchase flow working
- [ ] One-time job posting payment working
- [ ] Invoice generation (GST-compliant)
- [ ] Transaction history accessible
- [ ] Payment method management functional
- [ ] Auto-renewal working correctly
- [ ] Refund processing functional
- [ ] Discount codes applicable
- [ ] Multi-currency support implemented
- [ ] Tax calculations accurate
- [ ] Payment analytics dashboard complete
- [ ] Failed payment recovery in place
- [ ] All webhooks tested
- [ ] PCI-DSS compliance verified

---

## Timeline Estimate
**Duration:** 5-6 weeks

### Week 1-2: Payment Gateway Setup
- Razorpay integration
- Stripe integration
- Webhook handling
- Database schema

### Week 3: Subscription Management
- Plan creation and display
- Subscription purchase flow
- Job posting payments
- Credits system

### Week 4: Billing & Invoicing
- Invoice generation
- Transaction history
- Payment methods
- Auto-renewal logic

### Week 5: Advanced Features
- Discount codes
- Multi-currency
- Tax calculations
- Refund processing

### Week 6: Testing & Analytics
- Payment analytics
- Failed payment recovery
- Security testing
- Documentation

---

## Related Epics
- EPIC-04: Employer Job Posting (job posting payments)
- EPIC-05: Admin Panel (plan and payment management)
- EPIC-17: Multi-Region Support (multi-currency pricing)

---

**Epic Owner:** Backend Team Lead
**Stakeholders:** Product Manager, Finance Team, Legal/Compliance, DevOps
**Priority:** Critical (Revenue generation)
