-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `senderName` VARCHAR(191) NOT NULL DEFAULT '',
    `senderAddress` VARCHAR(191) NOT NULL DEFAULT '',
    `senderCity` VARCHAR(191) NOT NULL DEFAULT '',
    `apiToken` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
