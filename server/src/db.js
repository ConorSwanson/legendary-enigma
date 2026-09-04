const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { seedMultilist } = require('./utils/multilistSeed');

let lastMultilistResults = [];

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'climbs.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

const MOUNTAINS = [
  [1,  'Mount Elbert',            14440, 'Sawatch Range'],
  [2,  'Mount Massive',           14428, 'Sawatch Range'],
  [3,  'Mount Harvard',           14420, 'Sawatch Range'],
  [4,  'Mount Lincoln',           14286, 'Mosquito Range'],
  [5,  'Grays Peak',              14278, 'Front Range'],
  [6,  'Mount Antero',            14269, 'Sawatch Range'],
  [7,  'Torreys Peak',            14267, 'Front Range'],
  [8,  'Castle Peak',             14265, 'Elk Mountains'],
  [9,  'Quandary Peak',           14265, 'Mosquito Range'],
  [10, 'Mount Evans',             14264, 'Front Range'],
  [11, 'Longs Peak',              14259, 'Front Range'],
  [12, 'Mount Wilson',            14246, 'San Juan Mountains'],
  [13, 'Mount Shavano',           14229, 'Sawatch Range'],
  [14, 'Mount Belford',           14197, 'Sawatch Range'],
  [15, 'Crestone Peak',           14294, 'Sangre de Cristo'],
  [16, 'Crestone Needle',         14197, 'Sangre de Cristo'],
  [17, 'Mount Princeton',         14197, 'Sawatch Range'],
  [18, 'Mount Yale',              14196, 'Sawatch Range'],
  [19, 'Maroon Peak',             14156, 'Elk Mountains'],
  [20, 'Tabeguache Peak',         14155, 'Sawatch Range'],
  [21, 'Mount Oxford',            14153, 'Sawatch Range'],
  [22, 'Mount Sneffels',          14150, 'San Juan Mountains'],
  [23, 'Mount Democrat',          14148, 'Mosquito Range'],
  [24, 'Capitol Peak',            14130, 'Elk Mountains'],
  [25, 'Pikes Peak',              14115, 'Front Range'],
  [26, 'Snowmass Mountain',       14092, 'Elk Mountains'],
  [27, 'Windom Peak',             14082, 'San Juan Mountains'],
  [28, 'Sunlight Peak',           14059, 'San Juan Mountains'],
  [29, 'Handies Peak',            14048, 'San Juan Mountains'],
  [30, 'Wetterhorn Peak',         14015, 'San Juan Mountains'],
  [31, 'North Maroon Peak',       14014, 'Elk Mountains'],
  [32, 'San Luis Peak',           14014, 'San Juan Mountains'],
  [33, 'Mount of the Holy Cross', 14005, 'Sawatch Range'],
  [34, 'Huron Peak',              14003, 'Sawatch Range'],
  [35, 'Uncompahgre Peak',        14309, 'San Juan Mountains'],
  [36, 'Sunshine Peak',           14001, 'San Juan Mountains'],
  [37, 'Mount Sherman',           14036, 'Mosquito Range'],
  [38, 'Redcloud Peak',           14034, 'San Juan Mountains'],
  [39, 'Pyramid Peak',            14018, 'Elk Mountains'],
  [40, 'Wilson Peak',             14017, 'San Juan Mountains'],
  [41, 'Blanca Peak',             14345, 'Sangre de Cristo'],
  [42, 'La Plata Peak',           14336, 'Sawatch Range'],
  [43, 'Mount Cameron',           14238, 'Mosquito Range'],
  [44, 'Mount Bross',             14172, 'Mosquito Range'],
  [45, 'Kit Carson Peak',         14165, 'Sangre de Cristo'],
  [46, 'El Diente Peak',          14159, 'San Juan Mountains'],
  [47, 'Mount Eolus',             14083, 'San Juan Mountains'],
  [48, 'Challenger Point',        14081, 'Sangre de Cristo'],
  [49, 'Mount Columbia',          14073, 'Sawatch Range'],
  [50, 'Missouri Mountain',       14067, 'Sawatch Range'],
  [51, 'Humboldt Peak',           14064, 'Sangre de Cristo'],
  [52, 'Mount Bierstadt',         14060, 'Front Range'],
  [53, 'Culebra Peak',            14047, 'Sangre de Cristo'],
  [54, 'Ellingwood Point',        14042, 'Sangre de Cristo'],
  [55, 'Mount Lindsey',           14042, 'Sangre de Cristo'],
  [56, 'Little Bear Peak',        14037, 'Sangre de Cristo'],
  [57, 'North Eolus',             14039, 'San Juan Mountains'],
  [58, 'Conundrum Peak',           14060, 'Elk Mountains'],
];

// GPS coordinates for the 58 seed mountains, keyed by id. These never made
// it into the mountains table itself -- they used to live only in hardcoded
// client/iOS coordinate files, which were deleted on the assumption the
// server's lat/lng columns were the new source of truth. They weren't
// backfilled at the time, so every original 14er silently had NULL lat/lng
// (invisible on the map) until this backfill below.
const MOUNTAIN_COORDS = {
  1:  { lat: 39.1178, lng: -106.4454 }, // Mount Elbert
  2:  { lat: 39.1875, lng: -106.4756 }, // Mount Massive
  3:  { lat: 38.9244, lng: -106.3208 }, // Mount Harvard
  4:  { lat: 39.3511, lng: -106.1114 }, // Mount Lincoln
  5:  { lat: 39.6339, lng: -105.8172 }, // Grays Peak
  6:  { lat: 38.6745, lng: -106.2468 }, // Mount Antero
  7:  { lat: 39.6428, lng: -105.8212 }, // Torreys Peak
  8:  { lat: 39.0097, lng: -106.8614 }, // Castle Peak
  9:  { lat: 39.3972, lng: -106.1064 }, // Quandary Peak
  10: { lat: 39.5883, lng: -105.6438 }, // Mount Evans
  11: { lat: 40.2549, lng: -105.6152 }, // Longs Peak
  12: { lat: 37.8392, lng: -107.9917 }, // Mount Wilson
  13: { lat: 38.6194, lng: -106.2397 }, // Mount Shavano
  14: { lat: 38.9608, lng: -106.3603 }, // Mount Belford
  15: { lat: 37.9667, lng: -105.5853 }, // Crestone Peak
  16: { lat: 37.9647, lng: -105.5767 }, // Crestone Needle
  17: { lat: 38.7492, lng: -106.2425 }, // Mount Princeton
  18: { lat: 38.8436, lng: -106.3142 }, // Mount Yale
  19: { lat: 39.0706, lng: -106.9890 }, // Maroon Peak
  20: { lat: 38.6253, lng: -106.2508 }, // Tabeguache Peak
  21: { lat: 38.9647, lng: -106.3383 }, // Mount Oxford
  22: { lat: 38.0033, lng: -107.7922 }, // Mount Sneffels
  23: { lat: 39.3394, lng: -106.1392 }, // Mount Democrat
  24: { lat: 39.1503, lng: -107.0833 }, // Capitol Peak
  25: { lat: 38.8405, lng: -105.0442 }, // Pikes Peak
  26: { lat: 39.1189, lng: -107.0669 }, // Snowmass Mountain
  27: { lat: 37.6214, lng: -107.5928 }, // Windom Peak
  28: { lat: 37.6272, lng: -107.5956 }, // Sunlight Peak
  29: { lat: 37.9128, lng: -107.5042 }, // Handies Peak
  30: { lat: 38.0606, lng: -107.5100 }, // Wetterhorn Peak
  31: { lat: 39.0783, lng: -106.9872 }, // North Maroon Peak
  32: { lat: 38.0597, lng: -106.9317 }, // San Luis Peak
  33: { lat: 39.4669, lng: -106.4818 }, // Mount of the Holy Cross
  34: { lat: 38.9453, lng: -106.4386 }, // Huron Peak
  35: { lat: 38.0717, lng: -107.4622 }, // Uncompahgre Peak
  36: { lat: 37.9178, lng: -107.4250 }, // Sunshine Peak
  37: { lat: 39.2250, lng: -106.1697 }, // Mount Sherman
  38: { lat: 37.9408, lng: -107.4219 }, // Redcloud Peak
  39: { lat: 39.0714, lng: -106.9503 }, // Pyramid Peak
  40: { lat: 37.8600, lng: -107.9844 }, // Wilson Peak
  41: { lat: 37.5778, lng: -105.4853 }, // Blanca Peak
  42: { lat: 39.0294, lng: -106.4729 }, // La Plata Peak
  43: { lat: 39.3469, lng: -106.1181 }, // Mount Cameron
  44: { lat: 39.3347, lng: -106.1083 }, // Mount Bross
  45: { lat: 37.9797, lng: -105.6022 }, // Kit Carson Peak
  46: { lat: 37.8378, lng: -108.0061 }, // El Diente Peak
  47: { lat: 37.6217, lng: -107.6222 }, // Mount Eolus
  48: { lat: 37.9808, lng: -105.6067 }, // Challenger Point
  49: { lat: 38.9036, lng: -106.2997 }, // Mount Columbia
  50: { lat: 38.9478, lng: -106.3786 }, // Missouri Mountain
  51: { lat: 37.9761, lng: -105.5553 }, // Humboldt Peak
  52: { lat: 39.5828, lng: -105.7086 }, // Mount Bierstadt
  53: { lat: 37.1219, lng: -105.1864 }, // Culebra Peak
  54: { lat: 37.5828, lng: -105.4928 }, // Ellingwood Point
  55: { lat: 37.5839, lng: -105.4450 }, // Mount Lindsey
  56: { lat: 37.5667, lng: -105.4978 }, // Little Bear Peak
  57: { lat: 37.6228, lng: -107.6261 }, // North Eolus
  58: { lat: 39.0103, lng: -106.8561 }, // Conundrum Peak
};

// Default hero photos for each mountain -- CC0/Public Domain/CC-BY/CC-BY-SA
// photos sourced from Wikimedia Commons (NPS, BLM, USGS/NARA, Library of
// Congress, and individually-licensed contributor photos), self-hosted at
// server/src/assets/peak-photos/<filename>. rank 0 is the primary pick; a
// mountain can have up to a few for rotation. CC-BY/CC-BY-SA entries need
// their author/source_url surfaced as a visible credit line in the UI.
const MOUNTAIN_PHOTOS = [
  { mountainId: 1, rank: 0, filename: '1-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Elbert_from_Twin_Lakes.jpg' },
  { mountainId: 1, rank: 1, filename: '1-1.jpg', license: 'CC BY-SA 4.0', author: 'Szothner01', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt._Elbert_Colorado.jpg' },
  { mountainId: 2, rank: 0, filename: '2-0.jpg', license: 'Public Domain', author: 'Rick Kimpel Jr.', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Massive.jpg' },
  { mountainId: 2, rank: 1, filename: '2-1.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Massive_from_road_by_Twin_Lakes.jpg' },
  { mountainId: 2, rank: 2, filename: '2-2.jpg', license: 'CC BY-SA 3.0', author: 'Fredlyfish4', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt_Massive_from_Elbert.JPG' },
  { mountainId: 3, rank: 0, filename: '3-0.jpg', license: 'CC BY-SA 4.0', author: 'Pimlico27', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Harvard_from_Route_24.jpg' },
  { mountainId: 3, rank: 1, filename: '3-1.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Harvard_and_sign_from_U.S._Highway_24.jpg' },
  { mountainId: 4, rank: 0, filename: '4-0.jpg', license: 'CC0 1.0', author: 'Thomson200', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Lincoln_Colorado_July_2016.jpg' },
  { mountainId: 4, rank: 1, filename: '4-1.jpg', license: 'CC BY 2.0', author: 'Brian Brown', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lincoln_from_Bross.jpg' },
  { mountainId: 4, rank: 2, filename: '4-2.jpg', license: 'CC BY 3.0', author: 'Thomson M', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Lincoln_-_panoramio.jpg' },
  { mountainId: 5, rank: 0, filename: '5-0.jpg', license: 'CC BY 2.0', author: 'Heath Cajandig', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gray%27s_Peak_Sunrise_(44561125341).jpg' },
  { mountainId: 5, rank: 1, filename: '5-1.jpg', license: 'CC BY 2.0', author: 'Heath Cajandig', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Grays_Peak_(44613054512).jpg' },
  { mountainId: 5, rank: 2, filename: '5-2.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Grays_Peak_and_Torreys_Peak_from_Dillon_Reservoir.jpg' },
  { mountainId: 6, rank: 0, filename: '6-0.jpg', license: 'Public Domain', author: 'BLM Colorado', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_White_and_Mount_Antero.jpg' },
  { mountainId: 6, rank: 1, filename: '6-1.jpg', license: 'CC BY-SA 4.0', author: 'Chris Light', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt_Anteror_%26_Chalk_Cliffs_1501.jpg' },
  { mountainId: 6, rank: 2, filename: '6-2.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Antero,_taken_from_along_U.S._285,_near_the_town_of_Nathrop.jpg' },
  { mountainId: 7, rank: 0, filename: '7-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Torreys_Peak,_Colorado.jpg' },
  { mountainId: 7, rank: 1, filename: '7-1.jpg', license: 'CC BY-SA 3.0', author: 'Hogs555', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Torreys.JPG' },
  { mountainId: 8, rank: 0, filename: '8-0.jpg', license: 'Public Domain', author: 'Dbunde', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Castle_Peak_CO_Full.JPG' },
  { mountainId: 8, rank: 1, filename: '8-1.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Castle_Peak_panorama.jpg' },
  { mountainId: 9, rank: 0, filename: '9-0.jpg', license: 'Public Domain', author: 'Stargazer7121', sourceUrl: 'https://commons.wikimedia.org/wiki/File:QuandaryPeak.JPG' },
  { mountainId: 9, rank: 1, filename: '9-1.jpg', license: 'CC BY-SA 2.0', author: 'M M', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Quandary_Peak,_Colorado,_USA_(14382068790).jpg' },
  { mountainId: 9, rank: 2, filename: '9-2.jpg', license: 'CC BY 2.0', author: 'brian gautreau', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Looking_out_from_the_Summit_of_Mt_Quandry.jpg' },
  { mountainId: 10, rank: 0, filename: '10-0.jpg', license: 'CC BY-SA 2.0', author: 'David Zhang', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Boulders_Over_the_Tree_Lines,_Mount_Evans.jpg' },
  { mountainId: 10, rank: 1, filename: '10-1.jpg', license: 'CC BY-SA 4.0', author: 'DPH1110', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Evans.jpg' },
  { mountainId: 11, rank: 0, filename: '11-0.jpg', license: 'CC BY-SA 2.0', author: 'KimonBerlin', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Longs_Peak_(15035303494).jpg' },
  { mountainId: 12, rank: 0, filename: '12-0.jpg', license: 'Public Domain', author: 'Boyd Norton (EPA DOCUMERICA)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:MT._WILSON_AND_WEST_DOLORES_RIVER_-_NARA_-_544936.jpg' },
  { mountainId: 12, rank: 1, filename: '12-1.jpg', license: 'CC BY 2.0', author: 'Kylie Stewart', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gladstone_and_Wilson.jpg' },
  { mountainId: 13, rank: 0, filename: '13-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Angel_and_Grinch_of_Mount_Shavano.jpg' },
  { mountainId: 13, rank: 1, filename: '13-1.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Esprit_Point_and_Mount_Shavano.jpg' },
  { mountainId: 14, rank: 0, filename: '14-0.jpg', license: 'CC BY 3.0', author: 'Simpsora', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt._belford_north_approach.jpg' },
  { mountainId: 14, rank: 1, filename: '14-1.jpg', license: 'CC BY-SA 3.0', author: 'Hogs555', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Colorado_beauty.JPG' },
  { mountainId: 15, rank: 0, filename: '15-0.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Crestone_Peak_(50593918042).jpg' },
  { mountainId: 15, rank: 1, filename: '15-1.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Crestone_Peaks_Reflected_in_San_Luis_Lake_(47037790574).jpg' },
  { mountainId: 15, rank: 2, filename: '15-2.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Crestone_Peaks_(31820804363).jpg' },
  { mountainId: 16, rank: 0, filename: '16-0.jpg', license: 'Public Domain', author: 'Meniscus', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Crestone_needle_and_lower_south_colony_lake_2008.JPG' },
  { mountainId: 17, rank: 0, filename: '17-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Princeton_from_Cottonwood_Pass_road,_west_of_Buena_Vista.jpg' },
  { mountainId: 18, rank: 0, filename: '18-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Yale_from_along_US-24,_N_NW_of_Buena_Vista.jpg' },
  { mountainId: 18, rank: 1, filename: '18-1.jpg', license: 'CC BY-SA 3.0', author: 'Hogs555', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Yale.JPG' },
  { mountainId: 19, rank: 0, filename: '19-0.jpg', license: 'Public Domain', author: 'Carol M. Highsmith (Library of Congress)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_Maroon_Bells_twin-peak_formation_reflects_in_Maroon_Lake,_just_outside_Aspen_in_Colorado%27s_Rocky_Mountains_LCCN2015633962.tif' },
  { mountainId: 19, rank: 1, filename: '19-1.jpg', license: 'Public Domain', author: 'Carol M. Highsmith (Library of Congress)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_Maroon_Bells,_the_bare_peaks_to_the_left,_reflecting_into_Maroon_Lake_just_outside_Aspen,_considered_one_of_the,_if_not_the_most-coveted_photographic_spot_in_Colorado_LCCN2015633713.tif' },
  { mountainId: 19, rank: 2, filename: '19-2.jpg', license: 'CC BY 2.0', author: 'John Fowler', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Alpenglow_Maroon_Bells,_Maroon_Lake,_Colorado.jpg' },
  { mountainId: 20, rank: 0, filename: '20-0.jpg', license: 'CC BY-SA 4.0', author: 'John Sowell', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tabeguache_Peak,_Sawatch_Range,_Chaffee_County,_Colorado,_USA_01.jpg' },
  { mountainId: 21, rank: 0, filename: '21-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Oxford_from_Twin_Lakes_turnoff_from_U.S._24.jpg' },
  { mountainId: 22, rank: 0, filename: '22-0.jpg', license: 'Public Domain', author: 'Boyd Norton (EPA DOCUMERICA)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:MT._SNEFFELS_-_NARA_-_544909.jpg' },
  { mountainId: 22, rank: 1, filename: '22-1.jpg', license: 'CC BY 2.0', author: 'Alex Kerney', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Sneffels.jpg' },
  { mountainId: 22, rank: 2, filename: '22-2.jpg', license: 'CC BY-SA 3.0', author: 'Hogs555', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sneffels.JPG' },
  { mountainId: 23, rank: 0, filename: '23-0.jpg', license: 'CC BY-SA 3.0', author: 'Mofussy', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt_Democrat.jpg' },
  { mountainId: 23, rank: 1, filename: '23-1.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Democrat_from_Climax_Mine.jpg' },
  { mountainId: 24, rank: 0, filename: '24-0.jpg', license: 'CC BY-SA 3.0', author: 'MostlyDeserts', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Northeast_Ridge_of_Capitol_Peak.jpg' },
  { mountainId: 25, rank: 0, filename: '25-0.jpg', license: 'CC BY-SA 4.0', author: 'Bilco73', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gardens_of_the_Gods.jpg' },
  { mountainId: 25, rank: 1, filename: '25-1.jpg', license: 'CC BY-SA 3.0', author: 'David Shankbone', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pikes_Peak_by_David_Shankbone.jpg' },
  { mountainId: 26, rank: 0, filename: '26-0.jpg', license: 'Public Domain', author: 'Nelsestu', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hagerman_Peak_and_Snowmass_Mountain.jpg' },
  { mountainId: 27, rank: 0, filename: '27-0.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Windom_Peak_and_Unnamed_above_Chicago_Basin.jpg' },
  { mountainId: 28, rank: 0, filename: '28-0.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sunlight_Peak_w.jpg' },
  { mountainId: 28, rank: 1, filename: '28-1.jpg', license: 'CC BY 2.0', author: 'Kylie Stewart', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sunlight_Peak_from_Windom_Peak.jpg' },
  { mountainId: 29, rank: 0, filename: '29-0.jpg', license: 'CC BY-SA 4.0', author: 'Mitchtobin', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Handies_Peak_Colorado.jpg' },
  { mountainId: 29, rank: 1, filename: '29-1.jpg', license: 'Public Domain', author: 'Bob Wick (BLM)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Handies_Peak_WSA_(9467518106).jpg' },
  { mountainId: 30, rank: 0, filename: '30-0.jpg', license: 'Public Domain', author: 'Bob Wick (BLM)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Uncompahgre_Wilderness_(9500712189).jpg' },
  { mountainId: 31, rank: 0, filename: '31-0.jpg', license: 'CC BY-SA 3.0', author: 'MostlyDeserts', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Maroon_Bells_from_East.jpg' },
  { mountainId: 31, rank: 1, filename: '31-1.jpg', license: 'CC BY-SA 4.0', author: 'Rhododendrites', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Maroon_Bells_(11624).jpg' },
  { mountainId: 31, rank: 2, filename: '31-2.jpg', license: 'Public Domain', author: 'David Hiser (EPA DOCUMERICA)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:MAROON_LAKE_CAMPSITE,_12_MILES_NORTH_OF_ASPEN._SNOW_COVERED_PEAKS_IN_BACKGROUND_ARE_THE_14,000_FOOT_MAROON_BELLS_-_NARA_-_545714.jpg' },
  { mountainId: 32, rank: 0, filename: '32-0.jpg', license: 'CC BY-SA 4.0', author: 'John Sowell', sourceUrl: 'https://commons.wikimedia.org/wiki/File:San_Luis_Peak,_San_Juan_Mountains,_Saguache_County,_Colorado,_USA_03.jpg' },
  { mountainId: 32, rank: 1, filename: '32-1.jpg', license: 'CC BY-SA 4.0', author: 'John Sowell', sourceUrl: 'https://commons.wikimedia.org/wiki/File:San_Luis_Peak,_San_Juan_Mountains,_Saguache_County,_Colorado,_USA_01.jpg' },
  { mountainId: 32, rank: 2, filename: '32-2.jpg', license: 'CC BY-SA 4.0', author: 'John Sowell', sourceUrl: 'https://commons.wikimedia.org/wiki/File:San_Luis_Peak,_San_Juan_Mountains,_Saguache_County,_Colorado,_USA_02.jpg' },
  { mountainId: 33, rank: 0, filename: '33-0.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_of_the_Holy_Cross,_2009.jpg' },
  { mountainId: 33, rank: 1, filename: '33-1.jpg', license: 'CC BY 2.0', author: 'Dennis Yang', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Notch_and_Holy_Cross.jpg' },
  { mountainId: 34, rank: 0, filename: '34-0.jpg', license: 'CC BY 2.0', author: 'Craig Talbert', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Huron_Peak_(48458753091).jpg' },
  { mountainId: 34, rank: 1, filename: '34-1.jpg', license: 'CC BY-SA 2.0', author: 'Bruno Rijsman', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Huron_Peak.jpg' },
  { mountainId: 34, rank: 2, filename: '34-2.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Huron_Peak,_Colorado.jpg' },
  { mountainId: 35, rank: 0, filename: '35-0.jpg', license: 'CC BY 2.0', author: 'due_mele', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Uncompahgre_Peak_(20633459068).jpg' },
  { mountainId: 35, rank: 1, filename: '35-1.jpg', license: 'CC BY-SA 4.0', author: 'Robert M. Russell', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aspen_Gold.jpg' },
  { mountainId: 36, rank: 0, filename: '36-0.jpg', license: 'Public Domain', author: 'Bob Wick (BLM)', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Red_Cloud_Peak_WSA_(9470419585).jpg' },
  { mountainId: 37, rank: 0, filename: '37-0.jpg', license: 'CC0 1.0', author: '420 Photography', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt_Sherman.jpg' },
  { mountainId: 37, rank: 1, filename: '37-1.jpg', license: 'CC BY 2.0', author: 'Adam Baker', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hilltop_Mine_on_Mount_Sherman.jpg' },
  { mountainId: 37, rank: 2, filename: '37-2.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dyer,_Sherman,_and_Sheridan.jpg' },
  { mountainId: 38, rank: 0, filename: '38-0.jpg', license: 'CC BY-SA 4.0', author: 'Mitchtobin', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sanjuan14ers-8.jpg' },
  { mountainId: 38, rank: 1, filename: '38-1.jpg', license: 'CC BY-SA 4.0', author: 'Mitchtobin', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Redcloud_Peak_Summit_Colorado.jpg' },
  { mountainId: 39, rank: 0, filename: '39-0.jpg', license: 'CC BY-SA 3.0', author: 'EE One', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pyramid_Peak.jpg' },
  { mountainId: 40, rank: 0, filename: '40-0.jpg', license: 'CC0 1.0', author: 'Thomas Kelley', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Clouds_over_a_mountain_in_Telluride_(Unsplash).jpg' },
  { mountainId: 40, rank: 1, filename: '40-1.jpg', license: 'CC BY-SA 3.0', author: 'Hogs555', sourceUrl: 'https://commons.wikimedia.org/wiki/File:WilsonCO.JPG' },
  { mountainId: 40, rank: 2, filename: '40-2.jpg', license: 'CC BY-SA 2.0', author: 'Scott Ellis', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wilson_Peak_near_Telluride.jpg' },
  { mountainId: 41, rank: 0, filename: '41-0.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blanca_Peak_Alpenglow_(38109998236).jpg' },
  { mountainId: 41, rank: 1, filename: '41-1.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blanca_Peak_and_Little_Bear_Peak_(53025664960).jpg' },
  { mountainId: 41, rank: 2, filename: '41-2.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blanca_Peak_Summit_Illuminated_(51265729494).jpg' },
  { mountainId: 42, rank: 0, filename: '42-0.jpg', license: 'CC BY 2.0', author: 'Adam Reiner', sourceUrl: 'https://commons.wikimedia.org/wiki/File:La_Plata_Peak.jpg' },
  { mountainId: 42, rank: 1, filename: '42-1.jpg', license: 'CC BY 2.0', author: 'Nan Palmero', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Independence_Pass_Continental_Divide_-_July_2011_(5902795605).jpg' },
  { mountainId: 42, rank: 2, filename: '42-2.jpg', license: 'CC BY-SA 2.0', author: 'Rick Kimpel', sourceUrl: 'https://commons.wikimedia.org/wiki/File:La_Plata_Peak_and_Star_Mountain.jpg' },
  { mountainId: 43, rank: 0, filename: '43-0.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Cameron_from_west.jpg' },
  { mountainId: 43, rank: 1, filename: '43-1.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt._Cameron,_Colorado.jpg' },
  { mountainId: 43, rank: 2, filename: '43-2.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cameron_from_Lincoln.jpg' },
  { mountainId: 44, rank: 0, filename: '44-0.jpg', license: 'CC0 1.0', author: 'Thomson200', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Bross_viewed_from_Colorado_State_Highway_9.jpg' },
  { mountainId: 44, rank: 1, filename: '44-1.jpg', license: 'CC0 1.0', author: '420 Photography', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mt_Bross_Alma,_Colorado.jpg' },
  { mountainId: 44, rank: 2, filename: '44-2.jpg', license: 'CC BY 3.0', author: 'Thomson M', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Bross_-_panoramio.jpg' },
  { mountainId: 45, rank: 0, filename: '45-0.jpg', license: 'CC BY-SA 3.0', author: 'Fredlyfish4', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kit_Carson_from_Challenger.JPG' },
  { mountainId: 45, rank: 1, filename: '45-1.jpg', license: 'CC BY-SA 2.5', author: 'Adam Ginsburg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kit_carson_from_between.jpg' },
  { mountainId: 45, rank: 2, filename: '45-2.jpg', license: 'CC BY-SA 3.0', author: 'Fredlyfish4', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kit_Carson_Peak.JPG' },
  { mountainId: 46, rank: 0, filename: '46-0.jpg', license: 'CC BY-SA 3.0', author: 'MostlyDeserts', sourceUrl: 'https://commons.wikimedia.org/wiki/File:El_Diente_Peak.jpg' },
  { mountainId: 46, rank: 1, filename: '46-1.jpg', license: 'CC BY-SA 3.0', author: 'EE One', sourceUrl: 'https://commons.wikimedia.org/wiki/File:El_Diente_Peak.JPG' },
  { mountainId: 47, rank: 0, filename: '47-0.jpg', license: 'CC BY 2.0', author: 'Kylie Stewart', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Alpenglow_on_the_Eolus_Peaks.jpg' },
  { mountainId: 47, rank: 1, filename: '47-1.jpg', license: 'CC BY 2.0', author: 'Robert Tadlock', sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_ridge_from_N._Eolus_over_to_Eolus.jpg' },
  { mountainId: 47, rank: 2, filename: '47-2.jpg', license: 'CC BY-SA 2.0', author: 'Jeremiah LaRocco', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Eolus_summit.jpg' },
  { mountainId: 48, rank: 0, filename: '48-0.jpg', license: 'CC BY-SA 2.5', author: 'Adam Ginsburg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Challenger_point.jpg' },
  { mountainId: 48, rank: 1, filename: '48-1.jpg', license: 'CC BY-SA 3.0', author: 'Fredlyfish4', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Challenger_Point_from_Kit_Carson.JPG' },
  { mountainId: 48, rank: 2, filename: '48-2.jpg', license: 'CC BY-SA 3.0', author: 'Fredlyfish4', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Challenger_%26_Kit_Carson.JPG' },
  { mountainId: 49, rank: 0, filename: '49-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Columbia_from_along_US-24,_a_few_miles_N_NW_of_Buena_Vista.jpg' },
  { mountainId: 50, rank: 0, filename: '50-0.jpg', license: 'CC BY-SA 4.0', author: 'Jason Ronza', sourceUrl: 'https://commons.wikimedia.org/wiki/File:01_Missouri_Mountains.jpg' },
  { mountainId: 51, rank: 0, filename: '51-0.jpg', license: 'CC BY-SA 3.0', author: 'Hogs555', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Humboldtpeak.JPG' },
  { mountainId: 51, rank: 1, filename: '51-1.jpg', license: 'Public Domain', author: 'Meniscus', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Humboldt_Peak_from_near_south_colony_lakes_trailhead.jpg' },
  { mountainId: 51, rank: 2, filename: '51-2.jpg', license: 'CC BY-SA 2.5', author: 'Adam Ginsburg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Humboldt_peak.jpg' },
  { mountainId: 52, rank: 0, filename: '52-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Bierstadt,_Sawtooth,_Mount_Evans_(10579983656).jpg' },
  { mountainId: 52, rank: 1, filename: '52-1.jpg', license: 'CC0 1.0', author: 'Thomson200', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Bierstadt_seen_from_Guanella_Pass,_July_2016.jpg' },
  { mountainId: 52, rank: 2, filename: '52-2.jpg', license: 'CC BY 2.5', author: 'Adam Ginsburg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bierstadt_and_sawtooth.jpg' },
  { mountainId: 53, rank: 0, filename: '53-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Culebra_Peak_closeup_from_C-159.jpg' },
  { mountainId: 53, rank: 1, filename: '53-1.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Culebra_Peak.jpg' },
  { mountainId: 53, rank: 2, filename: '53-2.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Culebra_Peak_closeup.jpg' },
  { mountainId: 54, rank: 0, filename: '54-0.jpg', license: 'CC BY 2.0', author: 'Kylie Stewart', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blanca_Peak_and_Ellingwood_Point.jpg' },
  { mountainId: 54, rank: 1, filename: '54-1.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ellingwood_Point,_Colorado.jpg' },
  { mountainId: 54, rank: 2, filename: '54-2.jpg', license: 'CC BY-SA 3.0', author: 'Alethe88', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ellingwood-Blanca-bluelakesview01.jpg' },
  { mountainId: 55, rank: 0, filename: '55-0.jpg', license: 'CC BY 2.0', author: 'David Herrera', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mount_Lindsey_and_Iron_Nipple.jpg' },
  { mountainId: 55, rank: 1, filename: '55-1.jpg', license: 'Public Domain', author: 'Meniscus', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mtlindsey_from_blanca_2006.JPG' },
  { mountainId: 55, rank: 2, filename: '55-2.jpg', license: 'CC BY 3.0', author: 'Thomson M', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Little_Bear_Peak,_Hamilton_Peak_and_Mount_Lindsey_-_panoramio.jpg' },
  { mountainId: 56, rank: 0, filename: '56-0.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Blanca_Peak_and_Little_Bear_Peak_(53025664960).jpg' },
  { mountainId: 56, rank: 1, filename: '56-1.jpg', license: 'Public Domain', author: 'NPS / Patrick Myers', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Moon_over_Little_Bear_Peak_(51146418242).jpg' },
  { mountainId: 56, rank: 2, filename: '56-2.jpg', license: 'CC BY-SA 4.0', author: 'Kcujedi', sourceUrl: 'https://commons.wikimedia.org/wiki/File:14,037_ft_Little_Bear_Peak.jpg' },
  { mountainId: 57, rank: 0, filename: '57-0.jpg', license: 'CC BY 2.0', author: 'Robert Tadlock', sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_ridge_from_N._Eolus_over_to_Eolus.jpg' },
  { mountainId: 58, rank: 0, filename: '58-0.jpg', license: 'CC BY 2.0', author: 'Kylie Stewart', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Alpenglow_on_Conundrum.jpg' },
];

function initDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS mountains (
      id        INTEGER PRIMARY KEY,
      name      TEXT    NOT NULL UNIQUE,
      elevation INTEGER NOT NULL,
      range     TEXT    NOT NULL,
      lat       REAL,
      lng       REAL,
      source    TEXT,
      state     TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_id        TEXT    UNIQUE,
      email           TEXT    UNIQUE,
      password_hash   TEXT,
      apple_id        TEXT    UNIQUE,
      name            TEXT    NOT NULL DEFAULT 'Climber',
      bio             TEXT,
      avatar_path     TEXT,
      background_path TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS climbs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      mountain_id  INTEGER NOT NULL REFERENCES mountains(id),
      climb_date   TEXT    NOT NULL,
      notes        TEXT,
      photo_path   TEXT,
      visibility   TEXT    NOT NULL DEFAULT 'public',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id),
      CHECK (follower_id != following_id)
    );

    CREATE TABLE IF NOT EXISTS profile (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      name        TEXT    NOT NULL DEFAULT 'Climber',
      bio         TEXT,
      avatar_path TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_climbs_user     ON climbs(user_id);
    CREATE INDEX IF NOT EXISTS idx_climbs_mountain ON climbs(mountain_id);
    CREATE INDEX IF NOT EXISTS idx_climbs_date     ON climbs(climb_date);
    CREATE INDEX IF NOT EXISTS idx_follows_follower   ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following  ON follows(following_id);

    CREATE TABLE IF NOT EXISTS climb_likes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      climb_id   INTEGER NOT NULL REFERENCES climbs(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, climb_id)
    );
    CREATE INDEX IF NOT EXISTS idx_likes_climb ON climb_likes(climb_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type          TEXT    NOT NULL,
      climb_id      INTEGER REFERENCES climbs(id) ON DELETE CASCADE,
      comment_id    INTEGER REFERENCES climb_comments(id) ON DELETE CASCADE,
      invite_id     INTEGER REFERENCES climb_invites(id) ON DELETE CASCADE,
      guest_name    TEXT,
      is_read       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

    CREATE TABLE IF NOT EXISTS climb_comments (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      climb_id          INTEGER NOT NULL REFERENCES climbs(id) ON DELETE CASCADE,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_comment_id INTEGER REFERENCES climb_comments(id) ON DELETE CASCADE,
      body              TEXT    NOT NULL,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_climb ON climb_comments(climb_id);

    CREATE TABLE IF NOT EXISTS comment_likes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comment_id INTEGER NOT NULL REFERENCES climb_comments(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, comment_id)
    );
    CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);

    CREATE TABLE IF NOT EXISTS climb_photos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      climb_id   INTEGER NOT NULL REFERENCES climbs(id) ON DELETE CASCADE,
      photo_path TEXT    NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_climb_photos_climb ON climb_photos(climb_id);

    CREATE TABLE IF NOT EXISTS device_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, token)
    );
    CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

    CREATE TABLE IF NOT EXISTS beta_signups (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- A named, curated collection of peaks (e.g. "Colorado 14ers",
    -- "Colorado 13ers", and any future region/list). A peak can belong to
    -- more than one list, hence the separate membership table below.
    CREATE TABLE IF NOT EXISTS peak_lists (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      key         TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      region      TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS peak_list_memberships (
      peak_list_id INTEGER NOT NULL REFERENCES peak_lists(id) ON DELETE CASCADE,
      mountain_id  INTEGER NOT NULL REFERENCES mountains(id)  ON DELETE CASCADE,
      rank_in_list INTEGER,
      PRIMARY KEY (peak_list_id, mountain_id)
    );
    CREATE INDEX IF NOT EXISTS idx_plm_mountain ON peak_list_memberships(mountain_id);

    -- Default hero photos for a mountain, used whenever a climb/feed item has
    -- no user-uploaded photo of its own. Curated CC0/CC-BY/CC-BY-SA photos
    -- (server/src/assets/peak-photos/<filename>), rank 0 = primary; a peak
    -- can have several for rotation. license/author/source_url back the
    -- credit line CC-BY/CC-BY-SA photos require in the UI.
    CREATE TABLE IF NOT EXISTS mountain_photos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      mountain_id INTEGER NOT NULL REFERENCES mountains(id) ON DELETE CASCADE,
      rank        INTEGER NOT NULL,
      filename    TEXT    NOT NULL,
      license     TEXT    NOT NULL,
      author      TEXT,
      source_url  TEXT    NOT NULL,
      UNIQUE(mountain_id, rank)
    );
    CREATE INDEX IF NOT EXISTS idx_mountain_photos_mountain ON mountain_photos(mountain_id);

    -- A blocks B: hides each other's content from feeds/search and drops
    -- any existing follow relationship in either direction. Required for
    -- App Store Guideline 1.2 (UGC apps must let users block each other).
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (blocker_id, blocked_id),
      CHECK (blocker_id != blocked_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

    -- User-submitted reports against a user, climb, or comment (Guideline
    -- 1.2's other half: a way to flag objectionable content). target_id is
    -- polymorphic (points into users/climbs/climb_comments depending on
    -- target_type), so it's intentionally not a foreign key.
    CREATE TABLE IF NOT EXISTS content_reports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT    NOT NULL CHECK (target_type IN ('user', 'climb', 'comment')),
      target_id   INTEGER NOT NULL,
      reason      TEXT    NOT NULL,
      details     TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_type, target_id);

    -- One-time tokens emailed to a user who forgot their password. A fresh
    -- request deletes any previous token for that user, so only the most
    -- recently requested link ever works.
    CREATE TABLE IF NOT EXISTS password_resets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

    -- A proposed group climb: a peak, an optional date/note, and whoever's
    -- invited. share_token (nullable) backs the "invite someone not on the
    -- app yet" text/link path -- unlike named recipients below, it isn't
    -- tied to a single person, so the inviter can forward one link to a
    -- whole group chat and everyone who installs through it gets attached.
    CREATE TABLE IF NOT EXISTS climb_invites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      mountain_id INTEGER NOT NULL REFERENCES mountains(id) ON DELETE CASCADE,
      inviter_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      climb_date  TEXT,
      note        TEXT,
      share_token TEXT UNIQUE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_invites_inviter  ON climb_invites(inviter_id);
    CREATE INDEX IF NOT EXISTS idx_invites_mountain ON climb_invites(mountain_id);

    -- One row per person attached to an invite, whether picked by name from
    -- the inviter's followers or added later by claiming the share_token.
    CREATE TABLE IF NOT EXISTS climb_invite_recipients (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      invite_id    INTEGER NOT NULL REFERENCES climb_invites(id) ON DELETE CASCADE,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'maybe', 'declined')),
      via_link     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      responded_at TEXT,
      UNIQUE(invite_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_invite_recipients_invite ON climb_invite_recipients(invite_id);
    CREATE INDEX IF NOT EXISTS idx_invite_recipients_user   ON climb_invite_recipients(user_id);

    -- Peaks someone wants to climb but hasn't yet. Accepting a climb invite
    -- adds the peak here automatically (see routes/invites.js).
    CREATE TABLE IF NOT EXISTS mountain_wishlist (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mountain_id INTEGER NOT NULL REFERENCES mountains(id) ON DELETE CASCADE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, mountain_id)
    );
    CREATE INDEX IF NOT EXISTS idx_wishlist_user ON mountain_wishlist(user_id);

    -- A "yes" from someone who tapped a share-link invite but never made
    -- an account -- no user_id to attach to (that's the whole point), so
    -- this stays a separate table rather than a nullable column on
    -- climb_invite_recipients. serializeInvite() merges rows from both
    -- into one recipients array for the client.
    CREATE TABLE IF NOT EXISTS climb_invite_guest_responses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      invite_id  INTEGER NOT NULL REFERENCES climb_invites(id) ON DELETE CASCADE,
      guest_name TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_guest_responses_invite ON climb_invite_guest_responses(invite_id);
  `);

  // Migrate: add columns to legacy climbs table if missing
  const climbCols = db.pragma('table_info(climbs)').map(c => c.name);
  if (!climbCols.includes('user_id')) {
    db.exec('ALTER TABLE climbs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  }
  if (!climbCols.includes('visibility')) {
    db.exec("ALTER TABLE climbs ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'");
  }

  // Migrate: replace Clerk-based users table with email/password/Apple auth
  const userCols = db.pragma('table_info(users)').map(c => c.name);
  if (!userCols.includes('email')) {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE users_v2 (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        clerk_id        TEXT    UNIQUE,
        email           TEXT    UNIQUE,
        password_hash   TEXT,
        apple_id        TEXT    UNIQUE,
        name            TEXT    NOT NULL DEFAULT 'Climber',
        bio             TEXT,
        avatar_path     TEXT,
        background_path TEXT,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO users_v2 (id, clerk_id, name, bio, avatar_path, created_at)
        SELECT id, clerk_id, name, bio, avatar_path, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_v2 RENAME TO users;
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_apple ON users(apple_id);
    `);
    db.pragma('foreign_keys = ON');
  }

  // Migrate: add background_path if missing (no-op on new installs)
  const userColsNow = db.pragma('table_info(users)').map(c => c.name);
  if (!userColsNow.includes('background_path')) {
    db.exec('ALTER TABLE users ADD COLUMN background_path TEXT');
  }

  // Migrate: add level to notifications for level_up notifications (no-op on new installs)
  const notifColsNow = db.pragma('table_info(notifications)').map(c => c.name);
  if (!notifColsNow.includes('level')) {
    db.exec('ALTER TABLE notifications ADD COLUMN level INTEGER');
  }
  if (!notifColsNow.includes('comment_id')) {
    db.exec('ALTER TABLE notifications ADD COLUMN comment_id INTEGER REFERENCES climb_comments(id) ON DELETE CASCADE');
  }
  if (!notifColsNow.includes('invite_id')) {
    db.exec('ALTER TABLE notifications ADD COLUMN invite_id INTEGER REFERENCES climb_invites(id) ON DELETE CASCADE');
  }
  if (!notifColsNow.includes('guest_name')) {
    db.exec('ALTER TABLE notifications ADD COLUMN guest_name TEXT');
  }

  // Migrate: add parent_comment_id to climb_comments for threaded replies
  // (no-op on new installs). The index is created here, not alongside the
  // CREATE TABLE above, because CREATE TABLE IF NOT EXISTS is a no-op on an
  // existing table -- indexing the column there would run before this
  // migration adds it and crash initDb() on any pre-existing database.
  const commentColsNow = db.pragma('table_info(climb_comments)').map(c => c.name);
  if (!commentColsNow.includes('parent_comment_id')) {
    db.exec('ALTER TABLE climb_comments ADD COLUMN parent_comment_id INTEGER REFERENCES climb_comments(id) ON DELETE CASCADE');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_comments_parent ON climb_comments(parent_comment_id)');

  // Migrate: add lat/lng/source to mountains (no-op on new installs — these
  // are in the CREATE TABLE above going forward; this only backfills
  // databases created before this column set existed)
  const mountainCols = db.pragma('table_info(mountains)').map(c => c.name);
  if (!mountainCols.includes('lat')) {
    db.exec('ALTER TABLE mountains ADD COLUMN lat REAL');
  }
  if (!mountainCols.includes('lng')) {
    db.exec('ALTER TABLE mountains ADD COLUMN lng REAL');
  }
  if (!mountainCols.includes('source')) {
    db.exec('ALTER TABLE mountains ADD COLUMN source TEXT');
  }
  // Migrate: add state to mountains (no-op on new installs). Needed once
  // peaks started spanning multiple states with reused names ("Mount Tom"
  // in both California and New Hampshire) -- name collisions disambiguate
  // by state, and it fills the range/state UI text when a peak has no
  // named sub-range (most peaks outside Colorado's curated 58 don't).
  if (!mountainCols.includes('state')) {
    db.exec('ALTER TABLE mountains ADD COLUMN state TEXT');
  }

  const insertMountain = db.prepare(
    'INSERT OR IGNORE INTO mountains (id, name, elevation, range, source) VALUES (?, ?, ?, ?, ?)'
  );
  const seedMountains = db.transaction((list) => {
    for (const m of list) insertMountain.run(...m, 'seed');
  });
  seedMountains(MOUNTAINS);

  // Reconcile every mountain to its canonical row on every boot. This is
  // stronger than the INSERT OR IGNORE above: that silently no-ops if a row
  // with the same id already exists (even with stale/wrong data), or if a
  // name conflict blocks the insert. UPDATE-by-id fixes wrong data in place
  // without touching the id (safe — climbs.mountain_id keeps pointing at the
  // same row). The name column is UNIQUE, so any other row already holding
  // this name has to be resolved first — otherwise both the update and the
  // insert path below can fail the constraint.
  MOUNTAINS.forEach(([id, name, elevation, range]) => {
    const conflict = db.prepare('SELECT id FROM mountains WHERE name = ? AND id != ?').get(name, id);
    if (conflict) {
      const { c: inUse } = db.prepare('SELECT COUNT(*) AS c FROM climbs WHERE mountain_id = ?').get(conflict.id);
      if (inUse > 0) {
        console.warn(`[db] Mountain "${name}" occupies id ${conflict.id} (expected ${id}) and has climbs attached — skipping to avoid orphaning data`);
        return;
      }
      db.prepare('DELETE FROM mountains WHERE id = ?').run(conflict.id);
    }

    const byId = db.prepare('SELECT name, elevation, range FROM mountains WHERE id = ?').get(id);
    if (byId) {
      if (byId.name !== name || byId.elevation !== elevation || byId.range !== range) {
        db.prepare('UPDATE mountains SET name = ?, elevation = ?, range = ? WHERE id = ?')
          .run(name, elevation, range, id);
      }
      return;
    }
    db.prepare('INSERT INTO mountains (id, name, elevation, range, source) VALUES (?, ?, ?, ?, ?)').run(id, name, elevation, range, 'seed');
  });

  // Backfill coordinates for the 58 seed mountains, now that the rows above
  // are guaranteed to exist -- guarded by "lat IS NULL" so this never
  // overwrites real data and is a no-op after the first run.
  const backfillCoord = db.prepare('UPDATE mountains SET lat = ?, lng = ? WHERE id = ? AND lat IS NULL');
  for (const [id, { lat, lng }] of Object.entries(MOUNTAIN_COORDS)) {
    backfillCoord.run(lat, lng, Number(id));
  }

  // Backfill: grandfather the original 58 seed mountains into the new
  // peak_lists system as "Colorado 14ers" so existing behavior (all climbs,
  // badges, progress) is unaffected. Any future list (Colorado 13ers,
  // another region entirely) is just a new peak_lists row + membership rows
  // — no schema change needed per list.
  db.prepare(
    'INSERT OR IGNORE INTO peak_lists (key, name, region, description) VALUES (?, ?, ?, ?)'
  ).run('co-14ers', 'Colorado 14ers', 'Colorado', 'The 58 traditionally recognized Colorado peaks above 14,000 ft.');
  const co14ersListId = db.prepare('SELECT id FROM peak_lists WHERE key = ?').get('co-14ers').id;
  const insertMembership = db.prepare(
    'INSERT OR IGNORE INTO peak_list_memberships (peak_list_id, mountain_id, rank_in_list) VALUES (?, ?, ?)'
  );
  const backfillMemberships = db.transaction((list) => {
    const byElevationDesc = [...list].sort((a, b) => b[2] - a[2]);
    byElevationDesc.forEach(([id], i) => insertMembership.run(co14ersListId, id, i + 1));
  });
  backfillMemberships(MOUNTAINS);

  // Backfill default hero photos -- idempotent (INSERT OR IGNORE against the
  // mountain_id+rank UNIQUE constraint), so re-running never duplicates rows
  // or clobbers a photo an admin later swapped in manually.
  const insertMountainPhoto = db.prepare(
    'INSERT OR IGNORE INTO mountain_photos (mountain_id, rank, filename, license, author, source_url) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const backfillPhotos = db.transaction((list) => {
    for (const p of list) insertMountainPhoto.run(p.mountainId, p.rank, p.filename, p.license, p.author, p.sourceUrl);
  });
  backfillPhotos(MOUNTAIN_PHOTOS);

  // Reconcile the ADK 46 / CA 14ers+13ers / Catskill 3500 / NE 67 / NH 48 /
  // US State Highpoints dataset (341 peaks, 7 lists) -- see
  // utils/multilistSeed.js. This is the only way this data reaches
  // production: the live SQLite file is only reachable over HTTP, so this
  // has to run as part of boot-time seeding, same as everything above it.
  // Stashed on the module so scripts/import-multilist.js (which needs the
  // per-row results to regenerate badge STUBS) doesn't have to call this a
  // second time -- a second call is idempotent but reports everything as
  // already-present, since the first call here already did the work.
  lastMultilistResults = seedMultilist(db);

  db.prepare('INSERT OR IGNORE INTO profile (id, name) VALUES (1, ?)').run('Climber');

  // Seed App Store review account (idempotent — no-op if already exists)
  const reviewEmail = 'review@14erstracker.com';
  if (!db.prepare('SELECT id FROM users WHERE email = ?').get(reviewEmail)) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('Summit14er!', 12);
    db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(reviewEmail, hash, 'Apple Reviewer');
    console.log('[Seed] Created App Store review account');
  }

  console.log('Database ready at', DB_PATH);
}

module.exports = { getDb, initDb, UPLOADS_DIR, getLastMultilistResults: () => lastMultilistResults };
