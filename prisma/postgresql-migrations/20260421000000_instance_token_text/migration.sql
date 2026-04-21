-- ZapyFlow fork: Instance.token precisa ser TEXT pra acomodar Meta
-- Cloud API access tokens, que ultrapassam 255 chars.
ALTER TABLE "Instance" ALTER COLUMN "token" TYPE TEXT;
