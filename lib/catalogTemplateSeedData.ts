// Curated starter data for the global "Party Rental CRM Catalog" (see
// CatalogTemplate in prisma/schema.prisma and CATALOG_CATEGORIES in
// lib/catalogTemplates.ts). This is a representative, professionally-named
// starter set - not an exhaustive list of every rental product that
// exists. Names use consistent, customer-understandable formatting (e.g.
// "6' Rectangular Banquet Table", "20' x 40' Pole Tent") per the product
// naming standard.
//
// IMPORTANT: this file defines *global platform templates only*. It never
// creates, modifies, or deletes any tenant's Category or Item rows by
// itself. Applying this data is done idempotently (upsert by slug) via
// app/api/admin/catalog-templates/seed/route.ts, which only writes to the
// organizationId-less CatalogTemplate table.

export type CatalogTemplateSeed = {
  slug: string;
  name: string;
  categoryKey: string;
  type: string;
  sortOrder: number;
};

export const CATALOG_TEMPLATE_SEED_DATA: CatalogTemplateSeed[] = [

  // ---- tables ----
  { slug: "tables-4-rectangular-table", name: "4' Rectangular Table", categoryKey: "tables", type: "rental", sortOrder: 0 },
  { slug: "tables-6-rectangular-banquet-table", name: "6' Rectangular Banquet Table", categoryKey: "tables", type: "rental", sortOrder: 1 },
  { slug: "tables-8-rectangular-banquet-table", name: "8' Rectangular Banquet Table", categoryKey: "tables", type: "rental", sortOrder: 2 },
  { slug: "tables-30-cocktail-table", name: "30\" Cocktail Table", categoryKey: "tables", type: "rental", sortOrder: 3 },
  { slug: "tables-36-cocktail-table", name: "36\" Cocktail Table", categoryKey: "tables", type: "rental", sortOrder: 4 },
  { slug: "tables-48-round-table", name: "48\" Round Table", categoryKey: "tables", type: "rental", sortOrder: 5 },
  { slug: "tables-60-round-table", name: "60\" Round Table", categoryKey: "tables", type: "rental", sortOrder: 6 },
  { slug: "tables-72-round-table", name: "72\" Round Table", categoryKey: "tables", type: "rental", sortOrder: 7 },
  { slug: "tables-kids-table", name: "Kids Table", categoryKey: "tables", type: "rental", sortOrder: 8 },
  { slug: "tables-serpentine-table", name: "Serpentine Table", categoryKey: "tables", type: "rental", sortOrder: 9 },
  { slug: "tables-farm-table", name: "Farm Table", categoryKey: "tables", type: "rental", sortOrder: 10 },
  { slug: "tables-sweetheart-table", name: "Sweetheart Table", categoryKey: "tables", type: "rental", sortOrder: 11 },

  // ---- chairs ----
  { slug: "chairs-white-plastic-folding-chair", name: "White Plastic Folding Chair", categoryKey: "chairs", type: "rental", sortOrder: 12 },
  { slug: "chairs-black-plastic-folding-chair", name: "Black Plastic Folding Chair", categoryKey: "chairs", type: "rental", sortOrder: 13 },
  { slug: "chairs-white-resin-folding-chair", name: "White Resin Folding Chair", categoryKey: "chairs", type: "rental", sortOrder: 14 },
  { slug: "chairs-black-resin-folding-chair", name: "Black Resin Folding Chair", categoryKey: "chairs", type: "rental", sortOrder: 15 },
  { slug: "chairs-gold-chiavari-chair", name: "Gold Chiavari Chair", categoryKey: "chairs", type: "rental", sortOrder: 16 },
  { slug: "chairs-silver-chiavari-chair", name: "Silver Chiavari Chair", categoryKey: "chairs", type: "rental", sortOrder: 17 },
  { slug: "chairs-clear-chiavari-chair", name: "Clear Chiavari Chair", categoryKey: "chairs", type: "rental", sortOrder: 18 },
  { slug: "chairs-white-chiavari-chair", name: "White Chiavari Chair", categoryKey: "chairs", type: "rental", sortOrder: 19 },
  { slug: "chairs-cross-back-chair", name: "Cross Back Chair", categoryKey: "chairs", type: "rental", sortOrder: 20 },
  { slug: "chairs-garden-chair", name: "Garden Chair", categoryKey: "chairs", type: "rental", sortOrder: 21 },
  { slug: "chairs-kids-chair", name: "Kids Chair", categoryKey: "chairs", type: "rental", sortOrder: 22 },
  { slug: "chairs-folding-padded-chair", name: "Folding Padded Chair", categoryKey: "chairs", type: "rental", sortOrder: 23 },

  // ---- tents ----
  { slug: "tents-20-x-20-pole-tent", name: "20' x 20' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 24 },
  { slug: "tents-20-x-30-pole-tent", name: "20' x 30' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 25 },
  { slug: "tents-20-x-40-pole-tent", name: "20' x 40' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 26 },
  { slug: "tents-30-x-30-pole-tent", name: "30' x 30' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 27 },
  { slug: "tents-30-x-45-pole-tent", name: "30' x 45' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 28 },
  { slug: "tents-30-x-60-pole-tent", name: "30' x 60' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 29 },
  { slug: "tents-40-x-40-pole-tent", name: "40' x 40' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 30 },
  { slug: "tents-40-x-60-pole-tent", name: "40' x 60' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 31 },
  { slug: "tents-40-x-80-pole-tent", name: "40' x 80' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 32 },
  { slug: "tents-40-x-100-pole-tent", name: "40' x 100' Pole Tent", categoryKey: "tents", type: "rental", sortOrder: 33 },
  { slug: "tents-10-x-10-frame-tent", name: "10' x 10' Frame Tent", categoryKey: "tents", type: "rental", sortOrder: 34 },
  { slug: "tents-10-x-20-frame-tent", name: "10' x 20' Frame Tent", categoryKey: "tents", type: "rental", sortOrder: 35 },
  { slug: "tents-20-x-20-frame-tent", name: "20' x 20' Frame Tent", categoryKey: "tents", type: "rental", sortOrder: 36 },
  { slug: "tents-20-x-30-frame-tent", name: "20' x 30' Frame Tent", categoryKey: "tents", type: "rental", sortOrder: 37 },
  { slug: "tents-20-x-40-frame-tent", name: "20' x 40' Frame Tent", categoryKey: "tents", type: "rental", sortOrder: 38 },
  { slug: "tents-30-x-30-frame-tent", name: "30' x 30' Frame Tent", categoryKey: "tents", type: "rental", sortOrder: 39 },
  { slug: "tents-30-x-40-frame-tent", name: "30' x 40' Frame Tent", categoryKey: "tents", type: "rental", sortOrder: 40 },
  { slug: "tents-10-x-10-pop-up-canopy", name: "10' x 10' Pop-Up Canopy", categoryKey: "tents", type: "rental", sortOrder: 41 },
  { slug: "tents-10-x-20-pop-up-canopy", name: "10' x 20' Pop-Up Canopy", categoryKey: "tents", type: "rental", sortOrder: 42 },

  // ---- tent_accessories ----
  { slug: "tent-accessories-solid-sidewall", name: "Solid Sidewall", categoryKey: "tent_accessories", type: "rental", sortOrder: 43 },
  { slug: "tent-accessories-window-sidewall", name: "Window Sidewall", categoryKey: "tent_accessories", type: "rental", sortOrder: 44 },
  { slug: "tent-accessories-cathedral-sidewall", name: "Cathedral Sidewall", categoryKey: "tent_accessories", type: "rental", sortOrder: 45 },
  { slug: "tent-accessories-tent-lighting-package", name: "Tent Lighting Package", categoryKey: "tent_accessories", type: "rental", sortOrder: 46 },
  { slug: "tent-accessories-bistro-string-lighting", name: "Bistro/String Lighting", categoryKey: "tent_accessories", type: "rental", sortOrder: 47 },
  { slug: "tent-accessories-tent-fan", name: "Tent Fan", categoryKey: "tent_accessories", type: "rental", sortOrder: 48 },
  { slug: "tent-accessories-tent-heater", name: "Tent Heater", categoryKey: "tent_accessories", type: "rental", sortOrder: 49 },
  { slug: "tent-accessories-tent-leg-drapes", name: "Tent Leg Drapes", categoryKey: "tent_accessories", type: "rental", sortOrder: 50 },
  { slug: "tent-accessories-water-barrel", name: "Water Barrel", categoryKey: "tent_accessories", type: "rental", sortOrder: 51 },
  { slug: "tent-accessories-water-barrel-cover", name: "Water Barrel Cover", categoryKey: "tent_accessories", type: "rental", sortOrder: 52 },
  { slug: "tent-accessories-concrete-ballast", name: "Concrete Ballast", categoryKey: "tent_accessories", type: "rental", sortOrder: 53 },
  { slug: "tent-accessories-tent-stake", name: "Tent Stake", categoryKey: "tent_accessories", type: "rental", sortOrder: 54 },
  { slug: "tent-accessories-tent-flooring", name: "Tent Flooring", categoryKey: "tent_accessories", type: "rental", sortOrder: 55 },
  { slug: "tent-accessories-rain-gutter", name: "Rain Gutter", categoryKey: "tent_accessories", type: "rental", sortOrder: 56 },
  { slug: "tent-accessories-tent-connector", name: "Tent Connector", categoryKey: "tent_accessories", type: "rental", sortOrder: 57 },
  { slug: "tent-accessories-extension-cord", name: "Extension Cord", categoryKey: "tent_accessories", type: "rental", sortOrder: 58 },
  { slug: "tent-accessories-power-distribution-box", name: "Power Distribution Box", categoryKey: "tent_accessories", type: "rental", sortOrder: 59 },

  // ---- inflatables ----
  { slug: "inflatables-standard-bounce-house", name: "Standard Bounce House", categoryKey: "inflatables", type: "rental", sortOrder: 60 },
  { slug: "inflatables-themed-bounce-house", name: "Themed Bounce House", categoryKey: "inflatables", type: "rental", sortOrder: 61 },
  { slug: "inflatables-toddler-bounce-house", name: "Toddler Bounce House", categoryKey: "inflatables", type: "rental", sortOrder: 62 },
  { slug: "inflatables-bounce-house-combo", name: "Bounce House Combo", categoryKey: "inflatables", type: "rental", sortOrder: 63 },
  { slug: "inflatables-wet-dry-combo-bounce-house", name: "Wet/Dry Combo Bounce House", categoryKey: "inflatables", type: "rental", sortOrder: 64 },
  { slug: "inflatables-single-lane-water-slide", name: "Single-Lane Water Slide", categoryKey: "inflatables", type: "rental", sortOrder: 65 },
  { slug: "inflatables-dual-lane-water-slide", name: "Dual-Lane Water Slide", categoryKey: "inflatables", type: "rental", sortOrder: 66 },
  { slug: "inflatables-slip-slide", name: "Slip & Slide", categoryKey: "inflatables", type: "rental", sortOrder: 67 },
  { slug: "inflatables-inflatable-obstacle-course", name: "Inflatable Obstacle Course", categoryKey: "inflatables", type: "rental", sortOrder: 68 },
  { slug: "inflatables-interactive-sports-game", name: "Interactive Sports Game", categoryKey: "inflatables", type: "rental", sortOrder: 69 },
  { slug: "inflatables-inflatable-basketball-game", name: "Inflatable Basketball Game", categoryKey: "inflatables", type: "rental", sortOrder: 70 },
  { slug: "inflatables-inflatable-soccer-game", name: "Inflatable Soccer Game", categoryKey: "inflatables", type: "rental", sortOrder: 71 },
  { slug: "inflatables-interactive-challenge-game", name: "Interactive Challenge Game", categoryKey: "inflatables", type: "rental", sortOrder: 72 },

  // ---- linens ----
  { slug: "linens-90-round-linen", name: "90\" Round Linen", categoryKey: "linens", type: "rental", sortOrder: 73 },
  { slug: "linens-108-round-linen", name: "108\" Round Linen", categoryKey: "linens", type: "rental", sortOrder: 74 },
  { slug: "linens-120-round-linen", name: "120\" Round Linen", categoryKey: "linens", type: "rental", sortOrder: 75 },
  { slug: "linens-132-round-linen", name: "132\" Round Linen", categoryKey: "linens", type: "rental", sortOrder: 76 },
  { slug: "linens-60x120-rectangular-linen", name: "60x120 Rectangular Linen", categoryKey: "linens", type: "rental", sortOrder: 77 },
  { slug: "linens-90x132-rectangular-linen", name: "90x132 Rectangular Linen", categoryKey: "linens", type: "rental", sortOrder: 78 },
  { slug: "linens-90x156-rectangular-linen", name: "90x156 Rectangular Linen", categoryKey: "linens", type: "rental", sortOrder: 79 },
  { slug: "linens-table-runner", name: "Table Runner", categoryKey: "linens", type: "rental", sortOrder: 80 },
  { slug: "linens-napkin", name: "Napkin", categoryKey: "linens", type: "rental", sortOrder: 81 },
  { slug: "linens-chair-sash", name: "Chair Sash", categoryKey: "linens", type: "rental", sortOrder: 82 },
  { slug: "linens-cocktail-table-linen", name: "Cocktail Table Linen", categoryKey: "linens", type: "rental", sortOrder: 83 },
  { slug: "linens-6-spandex-table-cover", name: "6' Spandex Table Cover", categoryKey: "linens", type: "rental", sortOrder: 84 },
  { slug: "linens-8-spandex-table-cover", name: "8' Spandex Table Cover", categoryKey: "linens", type: "rental", sortOrder: 85 },

  // ---- wedding_decor ----
  { slug: "wedding-decor-wedding-arch", name: "Wedding Arch", categoryKey: "wedding_decor", type: "rental", sortOrder: 86 },
  { slug: "wedding-decor-hexagon-arch", name: "Hexagon Arch", categoryKey: "wedding_decor", type: "rental", sortOrder: 87 },
  { slug: "wedding-decor-circle-arch", name: "Circle Arch", categoryKey: "wedding_decor", type: "rental", sortOrder: 88 },
  { slug: "wedding-decor-flower-wall", name: "Flower Wall", categoryKey: "wedding_decor", type: "rental", sortOrder: 89 },
  { slug: "wedding-decor-backdrop-stand", name: "Backdrop Stand", categoryKey: "wedding_decor", type: "rental", sortOrder: 90 },
  { slug: "wedding-decor-pipe-drape", name: "Pipe & Drape", categoryKey: "wedding_decor", type: "rental", sortOrder: 91 },
  { slug: "wedding-decor-draping-panel", name: "Draping Panel", categoryKey: "wedding_decor", type: "rental", sortOrder: 92 },
  { slug: "wedding-decor-throne-chair", name: "Throne Chair", categoryKey: "wedding_decor", type: "rental", sortOrder: 93 },
  { slug: "wedding-decor-loveseat", name: "Loveseat", categoryKey: "wedding_decor", type: "rental", sortOrder: 94 },
  { slug: "wedding-decor-lounge-sofa", name: "Lounge Sofa", categoryKey: "wedding_decor", type: "rental", sortOrder: 95 },
  { slug: "wedding-decor-centerpiece-stand", name: "Centerpiece Stand", categoryKey: "wedding_decor", type: "rental", sortOrder: 96 },
  { slug: "wedding-decor-easel", name: "Easel", categoryKey: "wedding_decor", type: "rental", sortOrder: 97 },
  { slug: "wedding-decor-welcome-sign-stand", name: "Welcome Sign Stand", categoryKey: "wedding_decor", type: "rental", sortOrder: 98 },
  { slug: "wedding-decor-stanchion", name: "Stanchion", categoryKey: "wedding_decor", type: "rental", sortOrder: 99 },
  { slug: "wedding-decor-red-carpet-runner", name: "Red Carpet Runner", categoryKey: "wedding_decor", type: "rental", sortOrder: 100 },
  { slug: "wedding-decor-aisle-runner", name: "Aisle Runner", categoryKey: "wedding_decor", type: "rental", sortOrder: 101 },
  { slug: "wedding-decor-decor-column-pedestal", name: "Decor Column/Pedestal", categoryKey: "wedding_decor", type: "rental", sortOrder: 102 },

  // ---- games ----
  { slug: "games-giant-connect-four", name: "Giant Connect Four", categoryKey: "games", type: "rental", sortOrder: 103 },
  { slug: "games-giant-tumbling-timbers", name: "Giant Tumbling Timbers", categoryKey: "games", type: "rental", sortOrder: 104 },
  { slug: "games-cornhole-set", name: "Cornhole Set", categoryKey: "games", type: "rental", sortOrder: 105 },
  { slug: "games-giant-checkers", name: "Giant Checkers", categoryKey: "games", type: "rental", sortOrder: 106 },
  { slug: "games-giant-chess-set", name: "Giant Chess Set", categoryKey: "games", type: "rental", sortOrder: 107 },
  { slug: "games-ring-toss-game", name: "Ring Toss Game", categoryKey: "games", type: "rental", sortOrder: 108 },
  { slug: "games-ladder-toss-game", name: "Ladder Toss Game", categoryKey: "games", type: "rental", sortOrder: 109 },
  { slug: "games-carnival-game", name: "Carnival Game", categoryKey: "games", type: "rental", sortOrder: 110 },
  { slug: "games-basketball-shootout-game", name: "Basketball Shootout Game", categoryKey: "games", type: "rental", sortOrder: 111 },
  { slug: "games-putting-game", name: "Putting Game", categoryKey: "games", type: "rental", sortOrder: 112 },

  // ---- concessions ----
  { slug: "concessions-popcorn-machine", name: "Popcorn Machine", categoryKey: "concessions", type: "rental", sortOrder: 113 },
  { slug: "concessions-cotton-candy-machine", name: "Cotton Candy Machine", categoryKey: "concessions", type: "rental", sortOrder: 114 },
  { slug: "concessions-snow-cone-machine", name: "Snow Cone Machine", categoryKey: "concessions", type: "rental", sortOrder: 115 },
  { slug: "concessions-hot-dog-roller", name: "Hot Dog Roller", categoryKey: "concessions", type: "rental", sortOrder: 116 },
  { slug: "concessions-nacho-cheese-machine", name: "Nacho Cheese Machine", categoryKey: "concessions", type: "rental", sortOrder: 117 },
  { slug: "concessions-chocolate-fountain", name: "Chocolate Fountain", categoryKey: "concessions", type: "rental", sortOrder: 118 },
  { slug: "concessions-frozen-drink-machine", name: "Frozen Drink Machine", categoryKey: "concessions", type: "rental", sortOrder: 119 },
  { slug: "concessions-beverage-dispenser", name: "Beverage Dispenser", categoryKey: "concessions", type: "rental", sortOrder: 120 },
  { slug: "concessions-popcorn-kit", name: "Popcorn Kit", categoryKey: "concessions", type: "consumable", sortOrder: 121 },
  { slug: "concessions-popcorn-bags", name: "Popcorn Bags", categoryKey: "concessions", type: "consumable", sortOrder: 122 },
  { slug: "concessions-popcorn-oil", name: "Popcorn Oil", categoryKey: "concessions", type: "consumable", sortOrder: 123 },
  { slug: "concessions-cotton-candy-sugar", name: "Cotton Candy Sugar", categoryKey: "concessions", type: "consumable", sortOrder: 124 },
  { slug: "concessions-cotton-candy-cones", name: "Cotton Candy Cones", categoryKey: "concessions", type: "consumable", sortOrder: 125 },
  { slug: "concessions-snow-cone-syrup", name: "Snow Cone Syrup", categoryKey: "concessions", type: "consumable", sortOrder: 126 },
  { slug: "concessions-snow-cone-cups", name: "Snow Cone Cups", categoryKey: "concessions", type: "consumable", sortOrder: 127 },
  { slug: "concessions-straws-spoons", name: "Straws & Spoons", categoryKey: "concessions", type: "consumable", sortOrder: 128 },

  // ---- dance_floor_staging ----
  { slug: "dance-floor-staging-wood-dance-floor-section", name: "Wood Dance Floor Section", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 129 },
  { slug: "dance-floor-staging-white-dance-floor-section", name: "White Dance Floor Section", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 130 },
  { slug: "dance-floor-staging-black-dance-floor-section", name: "Black Dance Floor Section", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 131 },
  { slug: "dance-floor-staging-black-white-dance-floor-section", name: "Black & White Dance Floor Section", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 132 },
  { slug: "dance-floor-staging-stage-deck-section", name: "Stage Deck Section", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 133 },
  { slug: "dance-floor-staging-stage-steps", name: "Stage Steps", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 134 },
  { slug: "dance-floor-staging-stage-skirting", name: "Stage Skirting", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 135 },
  { slug: "dance-floor-staging-stage-rail", name: "Stage Rail", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 136 },
  { slug: "dance-floor-staging-stage-leg-riser", name: "Stage Leg/Riser", categoryKey: "dance_floor_staging", type: "rental", sortOrder: 137 },

  // ---- lighting_av ----
  { slug: "lighting-av-bistro-string-lights", name: "Bistro/String Lights", categoryKey: "lighting_av", type: "rental", sortOrder: 138 },
  { slug: "lighting-av-uplight", name: "Uplight", categoryKey: "lighting_av", type: "rental", sortOrder: 139 },
  { slug: "lighting-av-led-wash-light", name: "LED Wash Light", categoryKey: "lighting_av", type: "rental", sortOrder: 140 },
  { slug: "lighting-av-spotlight", name: "Spotlight", categoryKey: "lighting_av", type: "rental", sortOrder: 141 },
  { slug: "lighting-av-chandelier", name: "Chandelier", categoryKey: "lighting_av", type: "rental", sortOrder: 142 },
  { slug: "lighting-av-powered-speaker", name: "Powered Speaker", categoryKey: "lighting_av", type: "rental", sortOrder: 143 },
  { slug: "lighting-av-speaker-stand", name: "Speaker Stand", categoryKey: "lighting_av", type: "rental", sortOrder: 144 },
  { slug: "lighting-av-wireless-microphone", name: "Wireless Microphone", categoryKey: "lighting_av", type: "rental", sortOrder: 145 },
  { slug: "lighting-av-wired-microphone", name: "Wired Microphone", categoryKey: "lighting_av", type: "rental", sortOrder: 146 },
  { slug: "lighting-av-audio-mixer", name: "Audio Mixer", categoryKey: "lighting_av", type: "rental", sortOrder: 147 },
  { slug: "lighting-av-projector", name: "Projector", categoryKey: "lighting_av", type: "rental", sortOrder: 148 },
  { slug: "lighting-av-projection-screen", name: "Projection Screen", categoryKey: "lighting_av", type: "rental", sortOrder: 149 },
  { slug: "lighting-av-tv-display", name: "TV/Display", categoryKey: "lighting_av", type: "rental", sortOrder: 150 },
  { slug: "lighting-av-extension-cord", name: "Extension Cord", categoryKey: "lighting_av", type: "rental", sortOrder: 151 },
  { slug: "lighting-av-power-distribution-box", name: "Power Distribution Box", categoryKey: "lighting_av", type: "rental", sortOrder: 152 },

  // ---- catering_tableware ----
  { slug: "catering-tableware-dinner-plate", name: "Dinner Plate", categoryKey: "catering_tableware", type: "rental", sortOrder: 153 },
  { slug: "catering-tableware-salad-plate", name: "Salad Plate", categoryKey: "catering_tableware", type: "rental", sortOrder: 154 },
  { slug: "catering-tableware-dessert-plate", name: "Dessert Plate", categoryKey: "catering_tableware", type: "rental", sortOrder: 155 },
  { slug: "catering-tableware-bowl", name: "Bowl", categoryKey: "catering_tableware", type: "rental", sortOrder: 156 },
  { slug: "catering-tableware-dinner-fork", name: "Dinner Fork", categoryKey: "catering_tableware", type: "rental", sortOrder: 157 },
  { slug: "catering-tableware-salad-fork", name: "Salad Fork", categoryKey: "catering_tableware", type: "rental", sortOrder: 158 },
  { slug: "catering-tableware-dinner-knife", name: "Dinner Knife", categoryKey: "catering_tableware", type: "rental", sortOrder: 159 },
  { slug: "catering-tableware-teaspoon", name: "Teaspoon", categoryKey: "catering_tableware", type: "rental", sortOrder: 160 },
  { slug: "catering-tableware-tablespoon", name: "Tablespoon", categoryKey: "catering_tableware", type: "rental", sortOrder: 161 },
  { slug: "catering-tableware-water-goblet", name: "Water Goblet", categoryKey: "catering_tableware", type: "rental", sortOrder: 162 },
  { slug: "catering-tableware-wine-glass", name: "Wine Glass", categoryKey: "catering_tableware", type: "rental", sortOrder: 163 },
  { slug: "catering-tableware-champagne-flute", name: "Champagne Flute", categoryKey: "catering_tableware", type: "rental", sortOrder: 164 },
  { slug: "catering-tableware-rocks-glass", name: "Rocks Glass", categoryKey: "catering_tableware", type: "rental", sortOrder: 165 },
  { slug: "catering-tableware-highball-glass", name: "Highball Glass", categoryKey: "catering_tableware", type: "rental", sortOrder: 166 },
  { slug: "catering-tableware-chafing-dish", name: "Chafing Dish", categoryKey: "catering_tableware", type: "rental", sortOrder: 167 },
  { slug: "catering-tableware-serving-tray", name: "Serving Tray", categoryKey: "catering_tableware", type: "rental", sortOrder: 168 },
  { slug: "catering-tableware-beverage-dispenser", name: "Beverage Dispenser", categoryKey: "catering_tableware", type: "rental", sortOrder: 169 },
  { slug: "catering-tableware-coffee-urn", name: "Coffee Urn", categoryKey: "catering_tableware", type: "rental", sortOrder: 170 },
  { slug: "catering-tableware-insulated-food-carrier", name: "Insulated Food Carrier", categoryKey: "catering_tableware", type: "rental", sortOrder: 171 },
  { slug: "catering-tableware-cooler", name: "Cooler", categoryKey: "catering_tableware", type: "rental", sortOrder: 172 },
  { slug: "catering-tableware-portable-bar", name: "Portable Bar", categoryKey: "catering_tableware", type: "rental", sortOrder: 173 },
  { slug: "catering-tableware-fill-chill-table", name: "Fill & Chill Table", categoryKey: "catering_tableware", type: "rental", sortOrder: 174 },

  // ---- photo_booths ----
  { slug: "photo-booths-digital-photo-booth", name: "Digital Photo Booth", categoryKey: "photo_booths", type: "rental", sortOrder: 175 },
  { slug: "photo-booths-printing-photo-booth", name: "Printing Photo Booth", categoryKey: "photo_booths", type: "rental", sortOrder: 176 },
  { slug: "photo-booths-360-photo-booth", name: "360 Photo Booth", categoryKey: "photo_booths", type: "rental", sortOrder: 177 },
  { slug: "photo-booths-mirror-photo-booth", name: "Mirror Photo Booth", categoryKey: "photo_booths", type: "rental", sortOrder: 178 },
  { slug: "photo-booths-photo-booth-backdrop", name: "Photo Booth Backdrop", categoryKey: "photo_booths", type: "rental", sortOrder: 179 },
  { slug: "photo-booths-custom-photo-booth-backdrop", name: "Custom Photo Booth Backdrop", categoryKey: "photo_booths", type: "rental", sortOrder: 180 },
  { slug: "photo-booths-props-package", name: "Props Package", categoryKey: "photo_booths", type: "rental", sortOrder: 181 },
  { slug: "photo-booths-print-upgrade", name: "Print Upgrade", categoryKey: "photo_booths", type: "addon", sortOrder: 182 },
  { slug: "photo-booths-additional-hour", name: "Additional Hour", categoryKey: "photo_booths", type: "service", sortOrder: 183 },
  { slug: "photo-booths-attendant", name: "Attendant", categoryKey: "photo_booths", type: "service", sortOrder: 184 },

  // ---- climate_power ----
  { slug: "climate-power-generator", name: "Generator", categoryKey: "climate_power", type: "rental", sortOrder: 185 },
  { slug: "climate-power-tent-fan", name: "Tent Fan", categoryKey: "climate_power", type: "rental", sortOrder: 186 },
  { slug: "climate-power-pedestal-fan", name: "Pedestal Fan", categoryKey: "climate_power", type: "rental", sortOrder: 187 },
  { slug: "climate-power-patio-heater", name: "Patio Heater", categoryKey: "climate_power", type: "rental", sortOrder: 188 },
  { slug: "climate-power-tent-heater", name: "Tent Heater", categoryKey: "climate_power", type: "rental", sortOrder: 189 },
  { slug: "climate-power-portable-ac-unit", name: "Portable AC Unit", categoryKey: "climate_power", type: "rental", sortOrder: 190 },
  { slug: "climate-power-evaporative-cooler", name: "Evaporative Cooler", categoryKey: "climate_power", type: "rental", sortOrder: 191 },
  { slug: "climate-power-extension-cord", name: "Extension Cord", categoryKey: "climate_power", type: "rental", sortOrder: 192 },
  { slug: "climate-power-power-distribution-box", name: "Power Distribution Box", categoryKey: "climate_power", type: "rental", sortOrder: 193 },

  // ---- services ----
  { slug: "services-delivery", name: "Delivery", categoryKey: "services", type: "service", sortOrder: 194 },
  { slug: "services-pickup", name: "Pickup", categoryKey: "services", type: "service", sortOrder: 195 },
  { slug: "services-setup", name: "Setup", categoryKey: "services", type: "service", sortOrder: 196 },
  { slug: "services-breakdown", name: "Breakdown", categoryKey: "services", type: "service", sortOrder: 197 },
  { slug: "services-tent-installation", name: "Tent Installation", categoryKey: "services", type: "service", sortOrder: 198 },
  { slug: "services-same-day-pickup", name: "Same-Day Pickup", categoryKey: "services", type: "service", sortOrder: 199 },
  { slug: "services-next-day-pickup", name: "Next-Day Pickup", categoryKey: "services", type: "service", sortOrder: 200 },
  { slug: "services-after-hours-pickup", name: "After-Hours Pickup", categoryKey: "services", type: "service", sortOrder: 201 },
  { slug: "services-attendant", name: "Attendant", categoryKey: "services", type: "service", sortOrder: 202 },
  { slug: "services-additional-rental-hour", name: "Additional Rental Hour", categoryKey: "services", type: "service", sortOrder: 203 },
  { slug: "services-cleaning-fee", name: "Cleaning Fee", categoryKey: "services", type: "service", sortOrder: 204 },
  { slug: "services-damage-waiver", name: "Damage Waiver", categoryKey: "services", type: "service", sortOrder: 205 },
  { slug: "services-setup-labor", name: "Setup Labor", categoryKey: "services", type: "service", sortOrder: 206 },
  { slug: "services-stair-carry", name: "Stair Carry", categoryKey: "services", type: "service", sortOrder: 207 },
  { slug: "services-travel-fee", name: "Travel Fee", categoryKey: "services", type: "service", sortOrder: 208 },
  { slug: "services-distance-fee", name: "Distance Fee", categoryKey: "services", type: "service", sortOrder: 209 },
  { slug: "services-emergency-rush-delivery", name: "Emergency/Rush Delivery", categoryKey: "services", type: "service", sortOrder: 210 },
];
