# JAKDATA — Change Default Passwords Before Production

## WARNING
All seed accounts use default passwords.
MUST be changed before any public deployment.

## Default Accounts (CHANGE ALL OF THESE)

| Email | Current Password | Role |
|---|---|---|
| admin@jakdata.id | admin123 | Admin Pusat |
| koordinator.rt@jakdata.id | admin123 | Koordinator RT |
| warmindo@jakdata.id | admin123 | Warmindo |
| koordinator.kec.3172010@jakdata.id | Jakdata2026! | Koordinator Kecamatan |
| (all 691 koordinator) | Jakdata2026! | Koordinator * |

## How to Change

### Option 1 — Via API (recommended)
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@jakdata.id","password":"admin123"}' | jq -r .token)

curl -X PUT http://localhost:3001/api/users/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"admin123","newPassword":"YOUR_STRONG_PASSWORD"}'
```

### Option 2 — Direct Database Update
```bash
# Generate bcrypt hash
node -e "const b=require('bcrypt'); b.hash('NEW_PASSWORD',10).then(h=>console.log(h))"

# Update specific user
psql $DATABASE_URL -c \
  "UPDATE users SET password_hash='HASH' WHERE email='admin@jakdata.id';"

# Update all koordinator bulk
psql $DATABASE_URL -c \
  "UPDATE users SET password_hash='HASH' WHERE role LIKE 'koordinator_%';"
```

## Password Policy for Production
- Minimum 12 characters
- Mix uppercase, lowercase, numbers, symbols
- Different password per role level
- Admin password: known only to system owner
- Koordinator password: distributed securely per area
