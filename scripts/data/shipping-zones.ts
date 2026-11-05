/**
 * Default shipping zones, copied from the live shop.jivo.in checkout on 2026-10-16 by typing a state +
 * PIN code (nothing ordered) for about 280 PIN codes and several cart totals:
 *
 *  - Delhi NCR: only these 130 PIN codes, and the state must match (Haryana + 110027 gets nothing).
 *    ₹100 flat rate below ₹500, free shipping from ₹500. Cash on delivery is offered.
 *  - Punjab (whole state): free shipping from ₹500, nothing below. No cash on delivery: the checkout
 *    shows "Sorry! COD (Cash On Delivery) is not available at the moment."
 *  - Everywhere else: no shipping ("Enter your address to view shipping options."), so the
 *    "Rest of India" zone is seeded DISABLED. Enable it in Admin → Shipping to ship everywhere.
 *
 * One deliberate difference: on the old site a cart of exactly ₹500 got NO shipping method at all
 * (flat rate only below ₹500, free only above ₹500), so it could not be ordered. Here ₹500 is free.
 * PIN codes outside the ranges tested (110001–110100, 121001–121015, 121101–121107, 122000–122018,
 * 122050–122052, 122101–122108, 122413–122414, 122502–122508, 124501–124508, 131021–131030,
 * 201001–201021, 201101–201103, 201204–201206, 201300–201318, 203201–203209, 245101/201/304)
 * were not checked.
 */
const pins = (list: string) => list.trim().split(/\s+/);

export const DELHI_PINS = pins(`
110001 110002 110003 110005 110006 110007 110008 110009 110010 110011 110012 110013 110014 110015 110016 110017
110018 110019 110020 110021 110022 110023 110024 110025 110026 110027 110028 110029 110030 110031 110032 110033
110034 110035 110036 110037 110040 110041 110042 110043 110044 110045 110046 110047 110048 110049 110051 110052
110053 110054 110055 110057 110058 110059 110060 110061 110062 110063 110064 110065 110066 110067 110068 110070
110071 110074 110075 110076 110077 110078 110080 110082 110084 110085 110086 110087 110088 110089 110091 110092
110093 110094 110095 110096 110097 110098`);

export const HARYANA_NCR_PINS = pins(`
121001 121002 121003 121004 121005 121006 121007 121008 121009 121010 121012 121013 121101
122001 122002 122003 122004 122006 122008 122009 122010 122011 122015 122016 122017 122018 122051 122052 122101 122102 122505`);

export const UP_NCR_PINS = pins(`
201010 201011 201014 201017 201301 201302 201303 201304 201305 201306 201307 201308 201310`);

export const COD_UNAVAILABLE_NOTICE = "Sorry! COD (Cash On Delivery) is not available at the moment.";

type Rate = { type: "flat" | "free"; label: string; costRupees: number; minOrderRupees: number | null; sortOrder: number };
export type DefaultZone = {
  name: string;
  states: string[];
  pincodePrefixes: string[];
  isRestOfCountry: boolean;
  enabled: boolean;
  codEnabled: boolean;
  codUnavailableNotice: string | null;
  note: string;
  sortOrder: number;
  rates: Rate[];
};

const FREE_FROM_500: Rate = { type: "free", label: "Free shipping", costRupees: 0, minOrderRupees: 500, sortOrder: 1 };
const FLAT_100: Rate = { type: "flat", label: "Flat rate", costRupees: 100, minOrderRupees: null, sortOrder: 2 };
const NCR_NOTE = "Copied from shop.jivo.in (2026-10-16): ₹100 below ₹500, free from ₹500, cash on delivery.";

export const DEFAULT_ZONES: DefaultZone[] = [
  { name: "Delhi", states: ["DL"], pincodePrefixes: DELHI_PINS, isRestOfCountry: false, enabled: true, codEnabled: true, codUnavailableNotice: null, note: NCR_NOTE, sortOrder: 1, rates: [FREE_FROM_500, FLAT_100] },
  {
    name: "Delhi NCR – Haryana (Gurugram, Faridabad)",
    states: ["HR"],
    pincodePrefixes: HARYANA_NCR_PINS,
    isRestOfCountry: false,
    enabled: true,
    codEnabled: true,
    codUnavailableNotice: null,
    note: NCR_NOTE,
    sortOrder: 2,
    rates: [FREE_FROM_500, FLAT_100],
  },
  {
    name: "Delhi NCR – Uttar Pradesh (Noida, Ghaziabad)",
    states: ["UP"],
    pincodePrefixes: UP_NCR_PINS,
    isRestOfCountry: false,
    enabled: true,
    codEnabled: true,
    codUnavailableNotice: null,
    note: NCR_NOTE,
    sortOrder: 3,
    rates: [FREE_FROM_500, FLAT_100],
  },
  {
    name: "Punjab",
    states: ["PB"],
    pincodePrefixes: [],
    isRestOfCountry: false,
    enabled: true,
    codEnabled: false,
    codUnavailableNotice: COD_UNAVAILABLE_NOTICE,
    note: "Copied from shop.jivo.in (2026-10-16): free from ₹500, no shipping below, no cash on delivery.",
    sortOrder: 4,
    rates: [FREE_FROM_500],
  },
  {
    name: "Rest of India",
    states: [],
    pincodePrefixes: [],
    isRestOfCountry: true,
    enabled: false,
    codEnabled: false,
    codUnavailableNotice: null,
    note: "Disabled like shop.jivo.in (2026-10-16: no shipping outside Delhi NCR and Punjab). Enable it to ship everywhere with these rates.",
    sortOrder: 9,
    rates: [FREE_FROM_500, FLAT_100],
  },
];
