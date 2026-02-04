-- Add notifications field to Block and Task tables
ALTER TABLE "Block" ADD COLUMN "notifications" TEXT DEFAULT '[]';
ALTER TABLE "Task" ADD COLUMN "notifications" TEXT DEFAULT '[]';











