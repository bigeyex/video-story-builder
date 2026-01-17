export const DEFAULT_MODELS = {
  text: 'doubao-seed-1-8-251228',
  image: 'doubao-seedream-4-5-251128',
  video: 'doubao-seedance-1-5-pro-251215'
};

/**
 * Models that are considered "defaults" from previous versions.
 * If a user's setting matches one of these, it will be automatically upgraded to the current default.
 */
export const OLD_DEFAULT_MODELS = [
  'doubao-seed-1-6-251015',
  'doubao-seedream-4-5-251128', // Currently same, but listed for future
  'doubao-seedance-1-5-pro-251215', // Currently same
  'doubao-seedance-pro-sub-251015' // Old video model seen in code
];
