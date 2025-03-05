DO $$ BEGIN
 CREATE TYPE "public"."template_type" AS ENUM('invoice', 'quote');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"tax_number" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_price" text NOT NULL,
	"tax_rate" text DEFAULT '0' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_unit" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "template_type" NOT NULL,
	"logo_position" text DEFAULT 'top-left' NOT NULL,
	"primary_color" text DEFAULT '#000000' NOT NULL,
	"secondary_color" text DEFAULT '#ffffff' NOT NULL,
	"font" text DEFAULT 'Inter' NOT NULL,
	"header_html" text,
	"footer_html" text,
	"payment_terms" text,
	"notes" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text NOT NULL,
	"quantity" text DEFAULT '1' NOT NULL,
	"unit_price" text NOT NULL,
	"tax_rate" text DEFAULT '0' NOT NULL,
	"tax_amount" text DEFAULT '0' NOT NULL,
	"subtotal" text NOT NULL,
	"total" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"client_id" uuid,
	"template_id" uuid,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"subtotal" text DEFAULT '0' NOT NULL,
	"tax_amount" text DEFAULT '0' NOT NULL,
	"discount" text DEFAULT '0' NOT NULL,
	"total" text DEFAULT '0' NOT NULL,
	"notes" text,
	"terms_and_conditions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text NOT NULL,
	"quantity" text DEFAULT '1' NOT NULL,
	"unit_price" text NOT NULL,
	"tax_rate" text DEFAULT '0' NOT NULL,
	"tax_amount" text DEFAULT '0' NOT NULL,
	"subtotal" text NOT NULL,
	"total" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"quote_number" text NOT NULL,
	"client_id" uuid,
	"template_id" uuid,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp NOT NULL,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"subtotal" text DEFAULT '0' NOT NULL,
	"tax_amount" text DEFAULT '0' NOT NULL,
	"discount" text DEFAULT '0' NOT NULL,
	"total" text DEFAULT '0' NOT NULL,
	"notes" text,
	"terms_and_conditions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "todos";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "business_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "business_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "business_phone" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "business_address" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "business_logo" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "default_tax_rate" text DEFAULT '0';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "payment_instructions" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "terms_and_conditions" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotes" ADD CONSTRAINT "quotes_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
