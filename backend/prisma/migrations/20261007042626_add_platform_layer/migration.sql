-- CreateTable
CREATE TABLE `platform_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platform_users_username_key`(`username`),
    INDEX `platform_users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `level` INTEGER NOT NULL DEFAULT 100,
    `isSystemRole` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platform_roles_name_key`(`name`),
    INDEX `platform_roles_level_idx`(`level`),
    INDEX `platform_roles_isSystemRole_idx`(`isSystemRole`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platformUserId` INTEGER NOT NULL,
    `platformRoleId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `platform_user_roles_platformUserId_idx`(`platformUserId`),
    INDEX `platform_user_roles_platformRoleId_idx`(`platformRoleId`),
    UNIQUE INDEX `platform_user_roles_platformUserId_platformRoleId_key`(`platformUserId`, `platformRoleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_role_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platformRoleId` INTEGER NOT NULL,
    `permissionId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `platform_role_permissions_platformRoleId_idx`(`platformRoleId`),
    INDEX `platform_role_permissions_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `platform_role_permissions_platformRoleId_permissionId_key`(`platformRoleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platform_user_roles` ADD CONSTRAINT `platform_user_roles_platformUserId_fkey` FOREIGN KEY (`platformUserId`) REFERENCES `platform_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_user_roles` ADD CONSTRAINT `platform_user_roles_platformRoleId_fkey` FOREIGN KEY (`platformRoleId`) REFERENCES `platform_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_role_permissions` ADD CONSTRAINT `platform_role_permissions_platformRoleId_fkey` FOREIGN KEY (`platformRoleId`) REFERENCES `platform_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_role_permissions` ADD CONSTRAINT `platform_role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
