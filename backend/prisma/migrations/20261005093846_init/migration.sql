-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('OWNER', 'HRD', 'BM', 'ADMIN', 'KARYAWAN') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `employeeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_employeeId_key`(`employeeId`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeCode` VARCHAR(50) NULL,
    `name` VARCHAR(150) NOT NULL,
    `position` VARCHAR(100) NULL,
    `department` VARCHAR(100) NULL,
    `employmentDate` DATE NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_employeeCode_key`(`employeeCode`),
    INDEX `employees_name_idx`(`name`),
    INDEX `employees_status_idx`(`status`),
    INDEX `employees_employmentDate_idx`(`employmentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `totalDays` INTEGER NOT NULL,
    `type` ENUM('ANNUAL', 'MARRIAGE', 'OTHER') NOT NULL,
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING_MANAGEMENT', 'PENDING_OWNER', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_MANAGEMENT',
    `leavePeriodStart` DATE NOT NULL,
    `leavePeriodEnd` DATE NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `leave_requests_employeeId_idx`(`employeeId`),
    INDEX `leave_requests_startDate_endDate_idx`(`startDate`, `endDate`),
    INDEX `leave_requests_status_idx`(`status`),
    INDEX `leave_requests_leavePeriodStart_leavePeriodEnd_idx`(`leavePeriodStart`, `leavePeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leaveRequestId` INTEGER NOT NULL,
    `managementStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `managementApprovedById` INTEGER NULL,
    `managementApprovedAt` DATETIME(3) NULL,
    `managementNotes` TEXT NULL,
    `ownerStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `ownerApprovedById` INTEGER NULL,
    `ownerApprovedAt` DATETIME(3) NULL,
    `ownerNotes` TEXT NULL,
    `needsException` BOOLEAN NOT NULL DEFAULT false,
    `exceptionType` ENUM('HOLIDAY_ADJACENCY', 'OVERLAP', 'HOLIDAY_ADJACENCY_AND_OVERLAP') NULL,
    `exceptionStatus` ENUM('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_REQUIRED',
    `exceptionApprovedById` INTEGER NULL,
    `exceptionApprovedAt` DATETIME(3) NULL,
    `exceptionNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leave_approvals_leaveRequestId_key`(`leaveRequestId`),
    INDEX `leave_approvals_managementStatus_idx`(`managementStatus`),
    INDEX `leave_approvals_ownerStatus_idx`(`ownerStatus`),
    INDEX `leave_approvals_exceptionStatus_idx`(`exceptionStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `holidays_isActive_idx`(`isActive`),
    UNIQUE INDEX `holidays_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_approvals` ADD CONSTRAINT `leave_approvals_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_approvals` ADD CONSTRAINT `leave_approvals_managementApprovedById_fkey` FOREIGN KEY (`managementApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_approvals` ADD CONSTRAINT `leave_approvals_ownerApprovedById_fkey` FOREIGN KEY (`ownerApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_approvals` ADD CONSTRAINT `leave_approvals_exceptionApprovedById_fkey` FOREIGN KEY (`exceptionApprovedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
