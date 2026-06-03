CREATE TABLE `survey_responses` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`answer` enum('yes','no') NOT NULL,
	`followup` text,
	`sessionId` varchar(64),
	`activeCategory` varchar(64),
	`activeState` varchar(128),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_survey_answer` ON `survey_responses` (`answer`);--> statement-breakpoint
CREATE INDEX `idx_survey_time` ON `survey_responses` (`submittedAt`);