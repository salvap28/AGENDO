-- AlterTable
ALTER TABLE "Block" ADD COLUMN "repeatExceptions" JSONB DEFAULT [];

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "repeatExceptions" JSONB DEFAULT [];
