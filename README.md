# Loco Portal
Independent unofficial locomotive reference. Not affiliated with Indian Railways.

## Deploy
1. Push to main -> Vercel auto-deploys
2. Run ONLY supabase/migrations/0003_SAFE_no_data_loss.sql in Supabase SQL Editor (safe, additive, does not delete data)
3. Set env vars in Vercel
4. Master admin: adminapproval1@gmail.com

## Data Safety
- Existing locomotives are never deleted or overwritten
- Bulk upload only fills missing fields
- All changes require master approval
