/** Airbnb category / tag filters used by the V2 searcher (mirrors vibebnb). */

export type PropertyVibe = {
  kind: "property";
  id: number;
  label: string;
  /** Omitted while a category is still waiting on artwork. */
  icon?: string;
  /**
   * Extra property_type_id[] values ORed with `id`
   * (Airbnb ORs multiple property types).
   */
  extraIds?: number[];
};

export type ExtraVibe = {
  kind: "extra";
  key: string;
  label: string;
  icon?: string;
  tag?: string;
  amenity?: number;
};

export type Vibe = PropertyVibe | ExtraVibe;

export const PROPERTY_VIBES: PropertyVibe[] = [
  { kind: "property", id: 4, label: "Cabin", icon: "/icons/cabin.png" },
  { kind: "property", id: 11, label: "Villa", icon: "/icons/villa.png" },
  { kind: "property", id: 6, label: "Treehouse", icon: "/icons/treehouse.png" },
  { kind: "property", id: 5, label: "Castle", icon: "/icons/castle.png" },
  { kind: "property", id: 18, label: "Cave", icon: "/icons/cave.png" },
  { kind: "property", id: 17, label: "Dome", icon: "/icons/dome.png" },
  { kind: "property", id: 24, label: "Hut", icon: "/icons/hut.png" },
  { kind: "property", id: 23, label: "Earth home", icon: "/icons/earth-home.png" },
  { kind: "property", id: 67, label: "Tiny Homes", icon: "/icons/tiny-homes.png" },
  {
    kind: "property",
    id: 8,
    label: "Boat",
    icon: "/icons/boat.png",
    // Houseboat is its own host property type (64), distinct from Boat (8).
    extraIds: [64],
  },
  { kind: "property", id: 19, label: "Island", icon: "/icons/island.png" },
  { kind: "property", id: 63, label: "Farm stay", icon: "/icons/farm-stay.png" },
];

export const EXTRA_VIBES: ExtraVibe[] = [
  {
    kind: "extra",
    key: "beachfront",
    label: "Beachfront",
    icon: "/icons/beachfront.png",
    tag: "Tag:789",
  },
  {
    kind: "extra",
    key: "tower",
    label: "Tower",
    icon: "/icons/tower.png",
    tag: "Tag:8187",
  },
  { kind: "extra", key: "a-frame", label: "A-frame", icon: "/icons/chalet.png", tag: "Tag:8148" },
  { kind: "extra", key: "omg", label: "OMG!", icon: "/icons/omg.png", tag: "Tag:8225" },
  { kind: "extra", key: "design", label: "Design", icon: "/icons/design.png", tag: "Tag:8528" },
];

export const ALL_VIBES: Vibe[] = [...PROPERTY_VIBES, ...EXTRA_VIBES];

export function vibeKey(v: Vibe): string {
  return v.kind === "property" ? `p:${v.id}` : `e:${v.key}`;
}
