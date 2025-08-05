ALTER TABLE "dealerships" ADD COLUMN "scraper_order" integer;--> statement-breakpoint
CREATE INDEX "dealerships_scraper_order_idx" ON "dealerships" USING btree ("scraper_order");