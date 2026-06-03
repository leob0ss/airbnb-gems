CREATE TABLE `badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`badgeType` enum('LISTING_DESIGN_PUBLICATIONS','LISTING_NOTABLE_DESIGNER','TEXT_MATCH','OTHER') NOT NULL,
	`label` text NOT NULL,
	`value` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `click_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`activeFilter` varchar(128),
	`sessionId` varchar(64),
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `click_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`airbnbId` varchar(32) NOT NULL,
	`title` text NOT NULL,
	`imageUrl` text,
	`airbnbUrl` text NOT NULL,
	`rating` float,
	`reviewCount` int,
	`pricePerNight` int,
	`city` varchar(128),
	`region` varchar(128),
	`country` varchar(8) DEFAULT 'US',
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`description` text,
	`publications` text,
	`designers` text,
	`categories` text,
	`signalSource` enum('badge_publication','badge_designer','text_match','manual') NOT NULL DEFAULT 'text_match',
	`confidence` int DEFAULT 80,
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`indexedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `listings_airbnbId_unique` UNIQUE(`airbnbId`)
);
--> statement-breakpoint
ALTER TABLE `badges` ADD CONSTRAINT `badges_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `click_events` ADD CONSTRAINT `click_events_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_badges_listing` ON `badges` (`listingId`);--> statement-breakpoint
CREATE INDEX `idx_clicks_listing` ON `click_events` (`listingId`);--> statement-breakpoint
CREATE INDEX `idx_clicks_time` ON `click_events` (`clickedAt`);--> statement-breakpoint
CREATE INDEX `idx_listings_region` ON `listings` (`region`);--> statement-breakpoint
CREATE INDEX `idx_listings_active` ON `listings` (`active`);--> statement-breakpoint
CREATE INDEX `idx_listings_signal` ON `listings` (`signalSource`);