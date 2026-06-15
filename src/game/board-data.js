// Hasbro Monopoly India Edition — 40-space board
// rent arrays: [base, 1H, 2H, 3H, 4H, hotel]
// All amounts in M (same denomination as ₹)

const SPACES = [
  { pos: 0,  type: 'go',            name: 'GO' },
  { pos: 1,  type: 'property', id: 'guwahati',    name: 'Guwahati',    color: 'brown',     price: 60,  houseCost: 50,  mortgage: 30,  rent: [2,  10,  30,  90,  160, 250]  },
  { pos: 2,  type: 'community_chest', name: 'Community Chest' },
  { pos: 3,  type: 'property', id: 'bhubaneshwar', name: 'Bhubaneshwar', color: 'brown',    price: 60,  houseCost: 50,  mortgage: 30,  rent: [4,  20,  60,  180, 320, 450]  },
  { pos: 4,  type: 'tax',           name: 'Income Tax',   amount: 200 },
  { pos: 5,  type: 'railway', id: 'chennai_central', name: 'Chennai Central Railway Station', price: 200, mortgage: 100 },
  { pos: 6,  type: 'property', id: 'panaji',      name: 'Panaji (Goa)', color: 'light_blue', price: 100, houseCost: 50,  mortgage: 50,  rent: [6,  30,  90,  270, 400, 550]  },
  { pos: 7,  type: 'chance',        name: 'Chance' },
  { pos: 8,  type: 'property', id: 'agra',        name: 'Agra',        color: 'light_blue', price: 100, houseCost: 50,  mortgage: 50,  rent: [6,  30,  90,  270, 400, 550]  },
  { pos: 9,  type: 'property', id: 'vadodara',    name: 'Vadodara',    color: 'light_blue', price: 120, houseCost: 50,  mortgage: 60,  rent: [8,  40,  100, 300, 450, 600]  },
  { pos: 10, type: 'jail',          name: 'Just Visiting' },
  { pos: 11, type: 'property', id: 'ludhiana',    name: 'Ludhiana',    color: 'pink',      price: 140, houseCost: 100, mortgage: 70,  rent: [10, 50,  150, 450, 625, 750]  },
  { pos: 12, type: 'utility', id: 'electric_company', name: 'Electric Company', price: 150, mortgage: 75 },
  { pos: 13, type: 'property', id: 'patna',       name: 'Patna',       color: 'pink',      price: 140, houseCost: 100, mortgage: 70,  rent: [10, 50,  150, 450, 625, 750]  },
  { pos: 14, type: 'property', id: 'bhopal',      name: 'Bhopal',      color: 'pink',      price: 160, houseCost: 100, mortgage: 80,  rent: [12, 60,  180, 500, 700, 900]  },
  { pos: 15, type: 'railway', id: 'howrah',       name: 'Howrah Station', price: 200, mortgage: 100 },
  { pos: 16, type: 'property', id: 'indore',      name: 'Indore',      color: 'orange',    price: 180, houseCost: 100, mortgage: 90,  rent: [14, 70,  200, 550, 750, 950]  },
  { pos: 17, type: 'community_chest', name: 'Community Chest' },
  { pos: 18, type: 'property', id: 'nagpur',      name: 'Nagpur',      color: 'orange',    price: 180, houseCost: 100, mortgage: 90,  rent: [14, 70,  200, 550, 750, 950]  },
  { pos: 19, type: 'property', id: 'meerut',      name: 'Meerut',      color: 'orange',    price: 200, houseCost: 100, mortgage: 100, rent: [16, 80,  220, 600, 800, 1000] },
  { pos: 20, type: 'free_parking',  name: 'Free Parking' },
  { pos: 21, type: 'property', id: 'lucknow',     name: 'Lucknow',     color: 'red',       price: 220, houseCost: 150, mortgage: 110, rent: [18, 90,  250, 700, 875, 1050] },
  { pos: 22, type: 'chance',        name: 'Chance' },
  { pos: 23, type: 'property', id: 'chandigarh',  name: 'Chandigarh',  color: 'red',       price: 220, houseCost: 150, mortgage: 110, rent: [18, 90,  250, 700, 875, 1050] },
  { pos: 24, type: 'property', id: 'jaipur',      name: 'Jaipur',      color: 'red',       price: 240, houseCost: 150, mortgage: 120, rent: [20, 100, 300, 750, 925, 1100] },
  { pos: 25, type: 'railway', id: 'new_delhi',    name: 'New Delhi Railway Station', price: 200, mortgage: 100 },
  { pos: 26, type: 'property', id: 'pune',        name: 'Pune',        color: 'yellow',    price: 260, houseCost: 150, mortgage: 130, rent: [22, 110, 330, 800, 975, 1150] },
  { pos: 27, type: 'property', id: 'hyderabad',   name: 'Hyderabad',   color: 'yellow',    price: 260, houseCost: 150, mortgage: 130, rent: [22, 110, 330, 800, 975, 1150] },
  { pos: 28, type: 'utility', id: 'water_works',  name: 'Water Works', price: 150, mortgage: 75 },
  { pos: 29, type: 'property', id: 'ahmedabad',   name: 'Ahmedabad',   color: 'yellow',    price: 280, houseCost: 150, mortgage: 140, rent: [24, 120, 360, 850, 1025, 1200] },
  { pos: 30, type: 'go_to_jail',    name: 'Go to Jail' },
  { pos: 31, type: 'property', id: 'kolkata',     name: 'Kolkata',     color: 'green',     price: 300, houseCost: 200, mortgage: 150, rent: [26, 130, 390, 900, 1100, 1275] },
  { pos: 32, type: 'property', id: 'chennai_city', name: 'Chennai',    color: 'green',     price: 300, houseCost: 200, mortgage: 150, rent: [26, 130, 390, 900, 1100, 1275] },
  { pos: 33, type: 'community_chest', name: 'Community Chest' },
  { pos: 34, type: 'property', id: 'bengaluru',   name: 'Bengaluru',   color: 'green',     price: 320, houseCost: 200, mortgage: 160, rent: [28, 150, 450, 1000, 1200, 1400] },
  { pos: 35, type: 'railway', id: 'chhatrapati',  name: 'Chhatrapati Shivaji Station', price: 200, mortgage: 100 },
  { pos: 36, type: 'chance',        name: 'Chance' },
  { pos: 37, type: 'property', id: 'delhi',       name: 'Delhi',       color: 'dark_blue', price: 350, houseCost: 200, mortgage: 175, rent: [35, 175, 500, 1100, 1300, 1500] },
  { pos: 38, type: 'tax',           name: 'Super Tax',    amount: 100 },
  { pos: 39, type: 'property', id: 'mumbai',      name: 'Mumbai',      color: 'dark_blue', price: 400, houseCost: 200, mortgage: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

const COLOR_GROUPS = {
  brown:      ['guwahati', 'bhubaneshwar'],
  light_blue: ['panaji', 'agra', 'vadodara'],
  pink:       ['ludhiana', 'patna', 'bhopal'],
  orange:     ['indore', 'nagpur', 'meerut'],
  red:        ['lucknow', 'chandigarh', 'jaipur'],
  yellow:     ['pune', 'hyderabad', 'ahmedabad'],
  green:      ['kolkata', 'chennai_city', 'bengaluru'],
  dark_blue:  ['delhi', 'mumbai'],
};

const RAILWAYS = ['chennai_central', 'howrah', 'new_delhi', 'chhatrapati'];
const UTILITIES = ['electric_company', 'water_works'];

// Lookup by property id — build map once at module load
const SPACE_BY_ID = {};
SPACES.forEach(s => { if (s.id) SPACE_BY_ID[s.id] = s; });

function getSpaceById(id) {
  return SPACE_BY_ID[id] || null;
}

// Returns the color group name a property belongs to, or null
function getColorGroup(propertyId) {
  for (const [color, ids] of Object.entries(COLOR_GROUPS)) {
    if (ids.includes(propertyId)) return color;
  }
  return null;
}

module.exports = { SPACES, COLOR_GROUPS, RAILWAYS, UTILITIES, getSpaceById, getColorGroup };
