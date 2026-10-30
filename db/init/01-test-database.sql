-- Kører kun, når mysql-data er tom. Giver backend-test sin egen database og bruger,
-- så integrationstests ikke rører data i den almindelige database.
CREATE DATABASE IF NOT EXISTS hotel_kong_arthur_test CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'hotel_test'@'%' IDENTIFIED BY 'hotel_test';
GRANT ALL PRIVILEGES ON hotel_kong_arthur_test.* TO 'hotel_test'@'%';
