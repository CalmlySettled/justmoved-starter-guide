-- Add the webhook secret for custom auth emails
SELECT vault.create_secret('calmlysettled-webhook-secret-2025-xyz789', 'SEND_EMAIL_HOOK_SECRET');