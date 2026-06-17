CREATE TABLE "chat_history" (
	"id" serial PRIMARY KEY,
	"question" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
