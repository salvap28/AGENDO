-- Fix invalid JSON in notifications field
UPDATE "Block" SET notifications = '[]' WHERE notifications IS NULL OR notifications = '' OR notifications NOT LIKE '[%';
UPDATE "Task" SET notifications = '[]' WHERE notifications IS NULL OR notifications = '' OR notifications NOT LIKE '[%';











