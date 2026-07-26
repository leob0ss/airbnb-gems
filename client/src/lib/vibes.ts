/** Airbnb category / tag filters used by the V2 vibe searcher (mirrors vibebnb). */

export type PropertyVibe = {
  kind: "property";
  id: number;
  label: string;
  icon: string;
};

export type ExtraVibe = {
  kind: "extra";
  key: string;
  label: string;
  icon: string;
  tag?: string;
  amenity?: number;
};

export type Vibe = PropertyVibe | ExtraVibe;

export const PROPERTY_VIBES: PropertyVibe[] = [
  { kind: "property", id: 22, label: "Chalet", icon: "/icons/chalet.png" },
  { kind: "property", id: 4, label: "Cabin", icon: "/icons/cabin.png" },
  { kind: "property", id: 11, label: "Villa", icon: "/icons/villa.png" },
  { kind: "property", id: 6, label: "Treehouse", icon: "/icons/treehouse.png" },
  { kind: "property", id: 5, label: "Castle", icon: "/icons/castle.png" },
  { kind: "property", id: 18, label: "Cave", icon: "/icons/cave.png" },
  { kind: "property", id: 17, label: "Dome", icon: "/icons/dome.png" },
  { kind: "property", id: 15, label: "Yurt", icon: "/icons/yurt.png" },
  { kind: "property", id: 24, label: "Hut", icon: "/icons/hut.png" },
  { kind: "property", id: 23, label: "Earth home", icon: "/icons/earth-home.png" },
  { kind: "property", id: 8, label: "Boat", icon: "/icons/boat.png" },
  { kind: "property", id: 32, label: "Camper / RV", icon: "/icons/camper-rv.png" },
  { kind: "property", id: 34, label: "Tent", icon: "/icons/tent.png" },
  { kind: "property", id: 35, label: "Loft", icon: "/icons/loft.png" },
  { kind: "property", id: 36, label: "Townhouse", icon: "/icons/townhouse.png" },
  { kind: "property", id: 38, label: "Bungalow", icon: "/icons/bungalow.png" },
];

export const EXTRA_VIBES: ExtraVibe[] = [
  {
    kind: "extra",
    key: "ski",
    label: "Ski-in / ski-out",
    icon: "/icons/ski.png",
    tag: "Tag:681",
  },
  {
    kind: "extra",
    key: "fireplace",
    label: "Indoor fireplace",
    icon: "/icons/fireplace.png",
    amenity: 27,
  },
  {
    kind: "extra",
    key: "beachfront",
    label: "Beachfront",
    icon: "/icons/beachfront.png",
    tag: "Tag:789",
  },
  {
    kind: "extra",
    key: "barn",
    label: "Barn",
    icon: "/icons/barn.png",
    tag: "Tag:8159",
  },
  {
    kind: "extra",
    key: "tower",
    label: "Tower",
    icon: "/icons/tower.png",
    tag: "Tag:8187",
  },
];

export const ALL_VIBES: Vibe[] = [...PROPERTY_VIBES, ...EXTRA_VIBES];

export function vibeKey(v: Vibe): string {
  return v.kind === "property" ? `p:${v.id}` : `e:${v.key}`;
}
