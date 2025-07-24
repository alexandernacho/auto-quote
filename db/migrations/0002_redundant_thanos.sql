ALTER TABLE "profiles" ALTER COLUMN "membership" SET DEFAULT 'pro';--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "stripe_subscription_id";