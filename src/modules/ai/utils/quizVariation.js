export const createVariationSeed = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
