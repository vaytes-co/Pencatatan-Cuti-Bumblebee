/*
  Warnings:

  - Added the required column `actorType` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_companyId_fkey`;

-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `actorId` INTEGER NULL,
    ADD COLUMN `actorType` ENUM('PLATFORM', 'COMPANY', 'SYSTEM') NOT NULL,
    MODIFY `companyId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `audit_logs_actorType_actorId_idx` ON `audit_logs`(`actorType`, `actorId`);

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
