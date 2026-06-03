CREATE TABLE `filter_requests` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`whatLookingFor` text NOT NULL,
	`email` varchar(320),
	`sessionId` varchar(64),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `filter_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_filter_requests_time` ON `filter_requests` (`submittedAt`);