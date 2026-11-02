-- Værdier fra reference-data.md §2 og §3.
INSERT INTO room_type (id, name, max_guests, room_count, rate_low, rate_mid, rate_high) VALUES
  (1, 'Standard Single', 1, 44, 900, 1050, 1200),
  (2, 'Grand Lit', 2, 30, 1100, 1250, 1400),
  (3, 'Standard Double', 2, 58, 1200, 1400, 1600),
  (4, 'Superior Double', 2, 40, 1400, 1700, 2000),
  (5, 'Junior Suite', 3, 16, 1800, 2150, 2500),
  (6, 'Spa Executive', 2, 12, 2000, 2400, 2800),
  (7, 'Suite', 4, 8, 2500, 3000, 3500),
  (8, 'LOFT Suite', 4, 6, 3000, 3500, 4000);

-- Værelsesnummer = type-id × 100 + løbenummer: 101–144, 201–230, ..., 801–806.
INSERT INTO room (number, room_type_id)
WITH RECURSIVE seq (n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 58
)
SELECT room_type.id * 100 + seq.n, room_type.id
FROM room_type
JOIN seq ON seq.n <= room_type.room_count
ORDER BY room_type.id, seq.n;
