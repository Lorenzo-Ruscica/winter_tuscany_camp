



ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_lesson_type_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_lesson_type_check CHECK (lesson_type IN ('private', 'lecture', 'group lesson', 'break'));









