/*
  Warnings:

  - Added the required column `basis` to the `ComplaintDraft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contractId` to the `ComplaintDraft` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ComplaintDraft` DROP FOREIGN KEY `ComplaintDraft_campaignId_fkey`;

-- DropIndex
DROP INDEX `ComplaintDraft_campaignId_key` ON `ComplaintDraft`;

-- AlterTable
ALTER TABLE `ComplaintDraft` ADD COLUMN `basis` ENUM('SELF_MONITORING_ONLY', 'OFFICIAL_PROTOCOL') NOT NULL,
    ADD COLUMN `contractId` INTEGER NOT NULL,
    ADD COLUMN `reductionPercentMode` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO',
    MODIFY `campaignId` INTEGER NULL,
    MODIFY `claimedReductionPercent` DOUBLE NULL;

-- CreateTable
CREATE TABLE `OfficialProtocol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaignId` INTEGER NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OfficialProtocol_campaignId_key`(`campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ComplaintDraft_contractId_idx` ON `ComplaintDraft`(`contractId`);

-- CreateIndex
CREATE INDEX `ComplaintDraft_campaignId_idx` ON `ComplaintDraft`(`campaignId`);

-- AddForeignKey
ALTER TABLE `OfficialProtocol` ADD CONSTRAINT `OfficialProtocol_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplaintDraft` ADD CONSTRAINT `ComplaintDraft_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `Contract`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplaintDraft` ADD CONSTRAINT `ComplaintDraft_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
