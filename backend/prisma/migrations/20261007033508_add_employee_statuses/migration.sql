-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `companies` DROP FOREIGN KEY `companies_ownerUserId_fkey`;

-- DropForeignKey
ALTER TABLE `company_modules` DROP FOREIGN KEY `company_modules_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `company_modules` DROP FOREIGN KEY `company_modules_moduleId_fkey`;

-- DropForeignKey
ALTER TABLE `leave_approvals` DROP FOREIGN KEY `leave_approvals_leaveRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `migration_errors` DROP FOREIGN KEY `migration_errors_migrationJobId_fkey`;

-- DropForeignKey
ALTER TABLE `migration_items` DROP FOREIGN KEY `migration_items_migrationJobId_fkey`;

-- DropForeignKey
ALTER TABLE `migration_jobs` DROP FOREIGN KEY `migration_jobs_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_delegations` DROP FOREIGN KEY `permission_delegations_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_delegations` DROP FOREIGN KEY `permission_delegations_delegateUserId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_delegations` DROP FOREIGN KEY `permission_delegations_delegatorUserId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_delegations` DROP FOREIGN KEY `permission_delegations_permissionId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_delegations` DROP FOREIGN KEY `permission_delegations_targetRoleId_fkey`;

-- DropForeignKey
ALTER TABLE `role_permissions` DROP FOREIGN KEY `role_permissions_permissionId_fkey`;

-- DropForeignKey
ALTER TABLE `role_permissions` DROP FOREIGN KEY `role_permissions_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `settings` DROP FOREIGN KEY `settings_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `user_permissions` DROP FOREIGN KEY `user_permissions_permissionId_fkey`;

-- DropForeignKey
ALTER TABLE `user_permissions` DROP FOREIGN KEY `user_permissions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_userId_fkey`;

-- DropIndex
DROP INDEX `companies_ownerUserId_key` ON `companies`;

-- AlterTable
ALTER TABLE `companies` MODIFY `ownerUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `departments` MODIFY `code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `employees` MODIFY `employeeCode` VARCHAR(191) NULL,
    MODIFY `status` ENUM('ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `positions` MODIFY `code` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_delegations` ADD CONSTRAINT `permission_delegations_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_delegations` ADD CONSTRAINT `permission_delegations_delegatorUserId_fkey` FOREIGN KEY (`delegatorUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_delegations` ADD CONSTRAINT `permission_delegations_delegateUserId_fkey` FOREIGN KEY (`delegateUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_delegations` ADD CONSTRAINT `permission_delegations_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_delegations` ADD CONSTRAINT `permission_delegations_targetRoleId_fkey` FOREIGN KEY (`targetRoleId`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_modules` ADD CONSTRAINT `company_modules_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_modules` ADD CONSTRAINT `company_modules_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_approvals` ADD CONSTRAINT `leave_approvals_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `leave_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `migration_jobs` ADD CONSTRAINT `migration_jobs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `migration_items` ADD CONSTRAINT `migration_items_migrationJobId_fkey` FOREIGN KEY (`migrationJobId`) REFERENCES `migration_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `migration_errors` ADD CONSTRAINT `migration_errors_migrationJobId_fkey` FOREIGN KEY (`migrationJobId`) REFERENCES `migration_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
