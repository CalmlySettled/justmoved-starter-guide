-- Delete and recreate the webhook secret with the correct value
SELECT vault.delete_secret((SELECT id FROM vault.secrets WHERE name = 'SEND_EMAIL_HOOK_SECRET'));
SELECT vault.create_secret('calmlysettled-webhook-secret-2025-xyz789', 'SEND_EMAIL_HOOK_SECRET');