




INSERT INTO site_settings (key, value)
VALUES ('paid_registrations', '[]')
ON CONFLICT (key) DO NOTHING;
