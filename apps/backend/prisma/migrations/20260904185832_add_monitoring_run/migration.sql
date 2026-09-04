-- CreateTable
CREATE TABLE `MonitoringRun` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contractId` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `downloadMbit` DOUBLE NOT NULL,
    `uploadMbit` DOUBLE NOT NULL,
    `pingMs` DOUBLE NOT NULL,

    INDEX `MonitoringRun_contractId_idx`(`contractId`),
    INDEX `MonitoringRun_contractId_timestamp_idx`(`contractId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MonitoringRun` ADD CONSTRAINT `MonitoringRun_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
