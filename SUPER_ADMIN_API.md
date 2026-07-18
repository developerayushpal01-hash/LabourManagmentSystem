# Super Admin API Reference

Base URL: `/api/super-admin`

All endpoints require the normal HTTP-only authentication cookie and a user with role `SUPER_ADMIN`. Passwords and OTP fields are never returned.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/dashboard` | Platform totals: companies by status, users, labour, sites, current-month attendance, payments and invoices. |
| GET | `/companies` | Paginated company list. Filters: `page`, `limit`, `search`, `status`. |
| POST | `/companies` | Create a company and its primary CONTRACTOR login together. |
| GET | `/companies/:id` | Company, primary contractor and complete usage/financial statistics. |
| PUT | `/companies/:id` | Update company profile/contact/address/GST fields. |
| PATCH | `/companies/:id/status` | Set `ACTIVE`, `INACTIVE` or `BLOCKED`; disabling a company immediately disables its users. |
| DELETE | `/companies/:id` | Soft-delete company and revoke all of its user access. |
| GET | `/users` | Paginated platform users. Filters: `companyId`, `role`, `status`, `search`, `page`, `limit`. |
| GET | `/users/:id` | Get a non-Super-Admin user with company summary. |
| PUT | `/users/:id` | Update name/email/mobile and optionally reset password. |
| PATCH | `/users/:id/status` | Activate, deactivate or block a user. Company must be active before user activation. |
| DELETE | `/users/:id` | Soft-delete and disable a user. |

## Create company body

```json
{
  "companyName": "Example Contractors",
  "ownerName": "Owner Name",
  "email": "owner@example.com",
  "mobile": "9876543210",
  "password": "minimum8chars",
  "gstNumber": "OPTIONAL",
  "address": {
    "street": "Address",
    "city": "City",
    "state": "State",
    "pincode": "123456",
    "country": "India"
  }
}
```

## Status body

```json
{ "status": "ACTIVE" }
```

Allowed values: `ACTIVE`, `INACTIVE`, `BLOCKED`.

## User update body

Any subset of:

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "mobile": "9999999999",
  "password": "optional-new-password"
}
```

## Security behavior

- Tenant users cannot call these routes.
- Super Admin user records cannot be read or modified through tenant-user management routes.
- Company blocking/inactivation revokes access for all company users.
- Authentication middleware rejects users belonging to deleted, inactive or blocked companies.
- Company and user deletion is soft deletion to preserve business records.
- List endpoints are capped at 100 records per page.


## Full cross-company data access

### Discover supported resources

`GET /api/super-admin/data`

### Read a platform resource

`GET /api/super-admin/data/:resource`

Supported resource values:

| Resource | Data |
|---|---|
| `labours` | All labour profiles and skills |
| `sites` | All project sites and clients |
| `attendance` | All attendance records |
| `payments` | Labour salary/advance/bonus/incentive/deduction transactions |
| `salary-slips` | Complete calculated payroll and balances |
| `salary-payments` | Salary settlement transactions |
| `invoices` | All site invoices, line items, GST and payment balances |
| `skills` | Company skill and wage masters |
| `labour-sites` | Labour-to-site assignments and supervisors |
| `payroll-settings` | Company payroll, PF, ESIC, overtime and rounding settings |

Common query filters:

- `companyId`: restrict results to one company
- `from`, `to`: date range in YYYY-MM-DD
- `status`: supported on resources with a status field
- `month`, `year`: supported on salary resources
- `search`: supported on textual resources
- `page`, `limit`: pagination; maximum 100 per page
- `includeDeleted=true`: include archived/soft-deleted records

Examples:

```text
GET /api/super-admin/data/attendance?companyId=<id>&from=2026-07-01&to=2026-07-31
GET /api/super-admin/data/payments?year=2026&page=1&limit=50
GET /api/super-admin/data/invoices?status=ISSUED&includeDeleted=true
GET /api/super-admin/data/salary-slips?companyId=<id>&month=7&year=2026
```

These endpoints are read-only by design. Cross-tenant business-record mutation remains in tenant-scoped APIs to prevent accidental payroll, attendance or financial corruption.
## Subscription management

- `GET /subscriptions/summary` - totals, active/trial/past-due and revenue.
- `GET|POST /subscriptions` - list/filter or create a company subscription.
- `PUT /subscriptions/:id` - update plan, billing, dates, limits, features and payment.
- `PATCH /subscriptions/:id/status` - update lifecycle status.
- `DELETE /subscriptions/:id` - soft-delete and cancel.

## Notification management

- `GET /notifications/summary` - total, published, scheduled and unread counts.
- `GET|POST /notifications` - list/filter or create targeted notifications.
- `PUT /notifications/:id` - update content, targeting, scheduling and status.
- `PATCH /notifications/:id/read` - mark one read.
- `PATCH /notifications/read-all` - mark all published notifications read.
- `DELETE /notifications/:id` - archive notification.

Notification targets: `ALL`, `COMPANY`, `ROLE`, `USER`. Subscription control includes usage limits, feature flags, payment state, auto-renewal and lifecycle dates.
