ALTER TABLE "users" ADD COLUMN "cognito_sub" varchar(255);--> statement-breakpoint
CREATE INDEX "users_cognito_sub_idx" ON "users" USING btree ("cognito_sub");