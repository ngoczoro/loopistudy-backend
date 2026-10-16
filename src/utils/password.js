import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const dummyHashPromise = hashPassword("loopi-timing-equalizer");

/** Same bcrypt cost as a real check, so "unknown email" can't be told apart by response time. */
export const verifyAgainstDummyHash = async (password) => {
  await bcrypt.compare(String(password ?? ""), await dummyHashPromise);
  return false;
};
