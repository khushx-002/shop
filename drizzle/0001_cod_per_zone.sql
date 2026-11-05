ALTER TABLE "shipping_zones" ADD COLUMN "cod_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_zones" ADD COLUMN "cod_unavailable_notice" varchar(200);