-- Kører kun, når pg-data er tom. Giver backend-test sin egen database og bruger,
-- så integrationstests ikke rører data i den almindelige database.
CREATE USER hotel_test WITH PASSWORD 'hotel_test';
CREATE DATABASE hotel_kong_arthur_test OWNER hotel_test;
