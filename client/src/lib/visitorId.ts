const VISITOR_KEY = "ag_visitor_id";

const ADJECTIVES = [
  "amber",
  "brave",
  "bright",
  "calm",
  "clever",
  "cozy",
  "crisp",
  "curious",
  "dapper",
  "eager",
  "gentle",
  "golden",
  "happy",
  "jolly",
  "keen",
  "lucky",
  "merry",
  "nimble",
  "noble",
  "plucky",
  "quick",
  "quiet",
  "radiant",
  "rusty",
  "silky",
  "snug",
  "speedy",
  "sunny",
  "swift",
  "tidy",
  "vivid",
  "witty",
] as const;

const ANIMALS = [
  "badger",
  "beaver",
  "bison",
  "crane",
  "dolphin",
  "eagle",
  "falcon",
  "ferret",
  "finch",
  "fox",
  "gecko",
  "goose",
  "heron",
  "ibis",
  "koala",
  "lemur",
  "lynx",
  "moose",
  "otter",
  "owl",
  "panda",
  "penguin",
  "pigeon",
  "quail",
  "rabbit",
  "raven",
  "seal",
  "sparrow",
  "tiger",
  "turtle",
  "whale",
  "wolf",
] as const;

function pick<T extends readonly string[]>(list: T): T[number] {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** e.g. swift-otter-4821 — short, readable, fits VARCHAR(64). */
export function createVisitorId(): string {
  const n = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${n}`;
}

/** Stable anonymous ID for this browser (survives tab closes / returning tomorrow). */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = createVisitorId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Private mode / blocked storage — fall back for this page load only
    return createVisitorId();
  }
}
