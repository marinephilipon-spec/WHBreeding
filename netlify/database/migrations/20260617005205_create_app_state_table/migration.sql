CREATE TABLE "app_state" (
	"id" text PRIMARY KEY,
	"horses" jsonb DEFAULT '[]' NOT NULL,
	"actions" jsonb DEFAULT '[]' NOT NULL,
	"events" jsonb DEFAULT '[]' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
