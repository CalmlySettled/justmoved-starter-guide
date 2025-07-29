-- Update the webhook secret name to match Supabase's expected format
SELECT vault.update_secret('SEND_EMAIL_HOOK_SECRET', 'calmlysettled-webhook-secret-2025-xyz789');