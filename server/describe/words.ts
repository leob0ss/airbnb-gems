/**
 * How travellers talk about each filter, keyed by catalog key.
 * - exact: words that name the thing itself.
 * - closeEnough: phrases that strongly imply it.
 * Claude matches by meaning, so similar phrasings and other languages count
 * too. A wish that matches either list turns the filter on; anything else is
 * left out. Edit freely: add a phrase to widen a filter, remove one to narrow it.
 */
export const WORDS: Record<string, { exact?: string[]; closeEnough?: string[] }> = {
  "entire-home": {
    exact: ["entire place", "whole house", "whole place", "all to ourselves"],
    closeEnough: [
      "secluded",
      "private",
      "no neighbors",
      "middle of nowhere",
      "hideaway",
      "off-grid",
      "disconnect",
      "couple retreat",
      "quiet getaway for two",
      "just us",
    ],
  },

  cabin: {
    exact: [
      "cabin",
      "log cabin",
      "timber cabin",
      "mountain cabin",
      "lake cabin",
      "cabin in the woods",
      "cabaña",
      "cabane",
      "hytte",
      "stuga",
      "mökki",
    ],
    closeEnough: [
      "chalet",
      "rustic place in the woods",
      "woodsy getaway",
      "tucked into the woods",
      "cozy house in the woods",
      "log home",
      "camp-style escape",
      "camp (Maine, Adirondacks)",
      "up north (Midwest)",
      "Northwoods",
      "cottage country (Ontario)",
    ],
  },
  chalet: {
    exact: ["chalet", "mountain chalet", "mountain top chalet"],
    closeEnough: ["cabin", "alpine", "ski lodge", "ski weekend"],
  },
  castle: {
    exact: ["castle", "Burg", "château", "fortress"],
    closeEnough: ["Harry Potter", "Hogwarts", "medieval", "fairytale", "Game of Thrones", "knights"],
  },
  "earth-home": {
    exact: ["hobbit hole", "hobbit house", "hobbit home", "earth home", "underground home"],
    closeEnough: ["the Shire", "Lord of the Rings", "built into the hill"],
  },
  treehouse: {
    exact: ["treehouse", "tree house"],
    closeEnough: ["up in the trees", "in the treetops", "suspension bridges", "childhood dream"],
  },
  yurt: {
    exact: ["yurt", "Mongolian yurt", "ger"],
    closeEnough: ["glamping", "camping without needing all the gear"],
  },
  tent: {
    exact: ["tent", "safari tent", "bell tent"],
    closeEnough: ["glamping"],
  },
  dome: {
    exact: ["dome", "geodome", "geodesic dome"],
    closeEnough: ["glamping"],
  },
  "shepherds-hut": {
    exact: ["shepherd's hut"],
    closeEnough: ["glamping"],
  },

  "hot-tub": {
    exact: [
      "hot tub",
      "jacuzzi",
      "whirlpool",
      "spa pool",
      "a spa at the house",
      "cedar tub",
      "barrel hot tub",
      "wood-fired tub",
    ],
    closeEnough: [
      "soak under the stars",
      "somewhere to soak after skiing or hiking",
      "après-ski soak",
      "hot tub in the snow",
      "outdoor soak",
      "romantic getaway",
    ],
  },
  sauna: {
    exact: ["sauna", "infrared sauna", "barrel sauna"],
    closeEnough: ["sauna and cold plunge", "Nordic spa ritual"],
  },
  fireplace: {
    exact: ["fireplace", "stone fireplace", "wood stove", "wood-burning stove", "log fire"],
    closeEnough: ["cozy", "warm up by the fire", "curl up by the fire", "hygge"],
  },
  "fire-pit": {
    exact: ["fire pit", "firepit", "campfire", "bonfire"],
    closeEnough: ["s'mores", "sitting around a fire outside"],
  },
  bbq: {
    exact: ["BBQ", "barbecue", "grill", "cookout"],
    closeEnough: ["cooking outdoors"],
  },
  pool: {
    exact: ["pool", "swimming pool", "plunge pool"],
    closeEnough: ["lounging by the pool", "beating the heat"],
  },
  "patio-balcony": {
    exact: ["patio", "balcony", "terrace", "deck", "porch"],
    closeEnough: ["morning coffee outside", "outdoor seating"],
  },
  workspace: {
    exact: ["desk", "workspace", "home office"],
    closeEnough: ["remote work", "workation"],
  },

  "game-room": {
    exact: ["game room", "games room", "rec room"],
    closeEnough: ["lots of games", "bowling alley", "poker table", "something to keep the group entertained"],
  },
  "pool-table": {
    exact: ["pool table", "billiards", "snooker table"],
  },
  "game-console": {
    exact: ["game console", "PlayStation", "Xbox", "Nintendo", "video games"],
    closeEnough: ["gaming"],
  },
  arcade: {
    exact: ["arcade", "arcade games", "pinball"],
    closeEnough: ["retro games"],
  },
  "board-games": {
    exact: ["board games", "puzzles"],
    closeEnough: ["game night"],
  },
  "movie-theater": {
    exact: ["movie theater", "home theater", "cinema room", "screening room"],
    closeEnough: ["movie nights on a big screen"],
  },
  playroom: {
    exact: ["playroom", "play room", "kids' playroom"],
    closeEnough: ["somewhere for the kids to play", "toys for the kids"],
  },

  waterfront: {
    exact: [
      "waterfront",
      "lakefront",
      "lake house",
      "on a lake",
      "right on the water",
      "riverfront",
      "oceanfront",
    ],
    closeEnough: [
      "dock",
      "hang out on a dock",
      "the lake is the main focus",
      "near a stream or river",
      "creek",
      "seaview",
      "fall asleep to the waves",
    ],
  },
  "lake-access": {
    exact: ["lake access"],
    closeEnough: ["near a lake", "swim in the lake", "kayak on the lake"],
  },

  omg: {
    exact: ["unique", "unique stays", "one of a kind", "unusual", "quirky"],
    closeEnough: [
      "whimsical",
      "magical",
      "like something out of a fantasy film",
      "themed",
      "bucket list",
      "not a standard hotel",
    ],
  },
  design: {
    exact: ["architecture", "architectural", "design home"],
    closeEnough: ["stylish", "aesthetic", "Instagrammable"],
  },
  "guest-favorite": {
    exact: ["guest favorite", "top-rated", "highly reviewed", "best reviews"],
    closeEnough: ["fancy", "special occasion", "honeymoon"],
  },
};
