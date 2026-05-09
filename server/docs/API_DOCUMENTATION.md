# Apex Rentals API Documentation

Base URL: `http://localhost:5000`

API base URL: `http://localhost:5000/api`

## Multi-Tenancy

Manager registration creates an organization plus a dedicated Postgres tenant schema. Login returns a JWT tied to one `organizationId`. Tenant-scoped routes pass through `tenantResolver`, which verifies organization membership, active/trial organization status, and tenant schema availability.

Platform admin routes under `/api/admin/*` are global and require `super_admin`. They do not use tenant schema resolution. Cross-organization access is expected to fail; the endpoint suite verifies that one landlord cannot log into another organization's context or read another organization's property data.

Run the verified endpoint suite:

```bash
npm run test:endpoints
```

Latest local Docker result: `77 passed, 0 failed, 3 skipped`.

Skipped checks require real M-Pesa, Cloudinary, or Paystack credentials and `RUN_PROVIDER_TESTS=true`.

## Headers

JSON routes:

```http
Content-Type: application/json
Authorization: Bearer <jwt>
```

File routes use `multipart/form-data`.

## System

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| GET | `/` | None | None |
| GET | `/health` | None | None |

## Auth

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| GET | `/api/auth/properties/available` | Optional | None |
| GET | `/api/auth/me` | Required | None |
| POST | `/api/auth/register` | None | See examples below |
| POST | `/api/auth/inquiry` | None | See example below |
| POST | `/api/auth/login` | None | `{ "email": "landlord@example.com", "password": "Password123!", "organizationId": "organization-uuid" }` |
| POST | `/api/auth/change-password` | Required | `{ "currentPassword": "TempPass123!", "newPassword": "NewPass123!" }` |
| GET | `/api/auth/staff` | Landlord or super admin | None |
| POST | `/api/auth/staff` | Landlord or super admin | `{ "name": "Manager", "email": "manager@example.com", "password": "StaffPass123!", "role": "property_manager", "phoneNumber": "+254700000004" }` |

Landlord registration:

```json
{
  "name": "Main Landlord",
  "email": "landlord@example.com",
  "password": "Password123!",
  "role": "landlord",
  "phoneNumber": "+254700000001"
}
```

Tenant registration:

```json
{
  "name": "Tenant User",
  "email": "tenant@example.com",
  "password": "Password123!",
  "role": "tenant",
  "phoneNumber": "+254700000002",
  "interestedProperty": "property-uuid",
  "interestedUnit": "A1",
  "organizationId": "organization-uuid"
}
```

Guest inquiry:

```json
{
  "name": "Inquiry User",
  "email": "inquiry@example.com",
  "phoneNumber": "+254700000003",
  "interestedProperty": "property-uuid",
  "interestedUnit": "B1",
  "organizationId": "organization-uuid"
}
```

## Admin

All admin routes require `super_admin`.

| Method | Route | Payload |
| --- | --- | --- |
| GET | `/api/admin/summary` | None |
| GET | `/api/admin/organizations` | None |
| PUT | `/api/admin/organizations/:id/billing` | `{ "pricePerUnit": 500, "billingCycleMonths": 1, "status": "active" }` |
| GET | `/api/admin/logs?limit=60` | None |
| GET | `/api/admin/users/pending` | None |
| POST | `/api/admin/users/:userId/approve` | None |

## Billing

Billing routes require auth and tenant schema resolution.

| Method | Route | Payload |
| --- | --- | --- |
| GET | `/api/billing/my-billing` | None |
| POST | `/api/billing/pay-subscription` | None |

`pay-subscription` returns a Paystack `paymentUrl` when there is a balance, or `{ "message": "No balance due at this time." }` when the computed balance is zero.

## Properties And Tenants

Property routes require auth and tenant schema resolution.

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| GET | `/api/properties` | Required | None |
| POST | `/api/properties` | Landlord, property manager, super admin | See example below |
| PUT | `/api/properties/:id` | Manager for property, owner landlord, super admin | See example below |
| DELETE | `/api/properties/:id` | Manager for property, owner landlord, super admin | None |
| GET | `/api/properties/:id/tenants` | Manager for property, owner landlord, super admin | None |
| POST | `/api/tenants` | Landlord, property manager, super admin | See example below |
| GET | `/api/pending-registrations` | Landlord, property manager, super admin | None |
| POST | `/api/approve-registration/:userId` | Manager for requested property, owner landlord, super admin | See example below |
| POST | `/api/reject-registration/:userId` | Manager for requested property, owner landlord, super admin | None |

Create property:

```json
{
  "name": "Grand Residency",
  "address": "Nairobi CBD",
  "description": "Apartment block near CBD",
  "type": "apartment",
  "units": ["A1", "A2", "B1"],
  "landlord": "optional-landlord-user-uuid",
  "manager": "optional-manager-user-uuid"
}
```

Update property:

```json
{
  "name": "Grand Residency Updated",
  "address": "Nairobi West",
  "description": "",
  "type": "apartment",
  "units": ["A1", "A2", "B1", "C1"],
  "manager": "optional-manager-user-uuid"
}
```

Create tenant profile:

```json
{
  "user": "tenant-user-uuid",
  "property": "property-uuid",
  "unit": "A1",
  "rentAmount": 12000,
  "dueDate": 1,
  "status": "active",
  "leaseStart": "2026-01-01",
  "leaseEnd": "2026-12-31"
}
```

Approve tenant registration:

```json
{
  "rentAmount": 13000,
  "depositAmount": 13000,
  "dueDate": 1,
  "leaseStart": "2026-01-01",
  "leaseEnd": "2026-12-31"
}
```

## Units

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| GET | `/api/properties/:propertyId/units` | Manager for property, assigned tenant, super admin | None |
| POST | `/api/units` | Landlord, property manager, super admin | See example below |
| PUT | `/api/units/:id` | Landlord, property manager, super admin | See example below |

Create unit:

```json
{
  "propertyId": "property-uuid",
  "unitNumber": "D1",
  "rentAmount": 15000,
  "occupancyStatus": "vacant",
  "meterReadings": {
    "water": 10,
    "electricity": 50
  }
}
```

Update unit:

```json
{
  "unitNumber": "D1",
  "rentAmount": 15500,
  "occupancyStatus": "reserved",
  "meterReadings": {
    "water": 12,
    "electricity": 55
  },
  "isActive": true
}
```

`occupancyStatus`: `vacant`, `occupied`, `reserved`, `maintenance`.

## Messages

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| GET | `/api/messages?propertyId=property-uuid` | Required | None |
| POST | `/api/messages` | Required | `{ "content": "Welcome to the portal.", "propertyId": "optional-property-uuid" }` |
| POST | `/api/messages/toggle-global` | Landlord, property manager, super admin | `{ "enabled": true }` |

Tenants may omit `propertyId`; they default to their assigned property chat. Global tenant chat requires organization-wide chat to be enabled.

## Repairs

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| POST | `/api/repairs` | Active tenant assigned to property/unit | See examples below |
| GET | `/api/repairs` | Required | None |
| PUT | `/api/repairs/:id` | Manager for repair property, super admin | See example below |
| DELETE | `/api/repairs/:id` | Manager for repair property, super admin, or creating tenant | None |

Create repair request without image:

```json
{
  "propertyId": "property-uuid",
  "unit": "A1",
  "category": "plumbing",
  "description": "Kitchen sink leak"
}
```

Create repair request with image:

```text
propertyId=property-uuid
unit=A1
category=plumbing
description=Kitchen sink leak
image=@repair.jpg
```

Update repair request:

```json
{
  "status": "in-progress",
  "landlordResponse": "Technician assigned",
  "technicianDetails": "Plumber arrives today",
  "assignedTo": "staff-user-uuid",
  "cost": 500
}
```

`category`: `plumbing`, `electricity`, `security`, `general`.

`status`: `pending`, `in-progress`, `resolved`.

## Payments

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| GET | `/api/payments` | Required | None |
| POST | `/api/payments/stkpush` | Tenant paying self, manager for property, super admin | `{ "amount": 1, "phoneNumber": "254712345678", "tenantId": "tenant-profile-uuid" }` |
| GET | `/api/payments/settings` | Landlord or super admin | None |
| PUT | `/api/payments/settings` | Landlord or super admin | See example below |
| GET | `/api/payments/methods` | Required | None |
| POST | `/api/payments/callback` | None, M-Pesa callback | See example below |

Payment settings:

```json
{
  "mpesaShortcode": "174379",
  "mpesaConsumerKey": "consumer-key",
  "mpesaConsumerSecret": "consumer-secret",
  "mpesaPasskey": "passkey",
  "bankDetails": {
    "bankName": "Example Bank",
    "accountNumber": "1234567890",
    "accountName": "Apex Agencies"
  },
  "paymentMethods": ["mpesa", "bank_transfer"]
}
```

M-Pesa callback:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "merchant-id",
      "CheckoutRequestID": "checkout-id",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "MpesaReceiptNumber", "Value": "ABC123" }
        ]
      }
    }
  }
}
```

## Leases

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| POST | `/api/leases/upload` | Manager for property, super admin | Multipart fields below |
| GET | `/api/leases/tenant` | Required | None |
| GET | `/api/leases/landlord` | Landlord, property manager, super admin | None |
| GET | `/api/leases/view/:id` | Owning tenant, manager for property, super admin | None |
| DELETE | `/api/leases/:id` | Manager for property, super admin | None |

Lease upload multipart fields:

```text
tenantId=tenant-user-uuid
propertyId=property-uuid
unit=A1
startDate=2026-01-01
endDate=2026-12-31
depositAmount=12000
penaltyTerms=Standard terms
lease=@lease.pdf
```

## Suggestions

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| POST | `/api/suggestions` | Active tenant | `{ "content": "Please add hallway lighting." }` |
| GET | `/api/suggestions` | Landlord, property manager, super admin | None |

## Notifications

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| GET | `/api/notifications` | Required | None |
| PATCH | `/api/notifications/:id/read` | Notification owner | None |

## Reminders

All reminder routes require landlord, property manager, or super admin.

| Method | Route | Payload |
| --- | --- | --- |
| POST | `/api/reminders/toggle` | `{ "enabled": true }` |
| POST | `/api/reminders/settings` | `{ "beforeDays": 3, "afterDays": 5 }` |
| POST | `/api/reminders/manual` | `{ "tenantId": "tenant-profile-uuid" }` |
| POST | `/api/reminders/trigger-all` | None |

## Paystack Webhook

| Method | Route | Auth | Payload |
| --- | --- | --- | --- |
| POST | `/api/webhooks/paystack` | None, `x-paystack-signature` required | See example below |

```json
{
  "event": "charge.success",
  "data": {
    "amount": 50000,
    "reference": "paystack-reference",
    "metadata": {
      "organizationId": "organization-uuid",
      "type": "subscription_payment"
    }
  }
}
```
