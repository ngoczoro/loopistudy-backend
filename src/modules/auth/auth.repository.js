import sequelize from "../../config/database.js";

const models = () => sequelize.models;

export const findUserByEmail = async (email) => {
  const { User } = models();
  return User.findOne({ where: { email } });
};

export const findUserById = async (userId) => {
  const { User } = models();
  return User.findByPk(userId);
};

export const createUser = async (data) => {
  const { User } = models();
  return User.create(data);
};

export const updateUser = async (user, data) => {
  return user.update(data);
};

export const reloadUser = async (user) => user.reload();

export const invalidateActiveOtpsForEmail = async (email) => {
  const { EmailOtp } = models();
  return EmailOtp.update(
    { isUsed: true },
    { where: { email, isUsed: false } },
  );
};

export const createOtpRecord = async (data) => {
  const { EmailOtp } = models();
  return EmailOtp.create(data);
};

export const findLatestActiveOtp = async (email) => {
  const { EmailOtp } = models();
  return EmailOtp.findOne({
    where: { email, isUsed: false },
    order: [["created_at", "DESC"]],
  });
};

export const updateOtpRecord = async (otpRecord, data) => {
  return otpRecord.update(data);
};

export const createRefreshToken = async (data) => {
  const { RefreshToken } = models();
  return RefreshToken.create(data);
};

export const findActiveRefreshToken = async ({ tokenHash, userId }) => {
  const { RefreshToken } = models();
  return RefreshToken.findOne({
    where: {
      tokenHash,
      userId,
      revoked: false,
    },
  });
};

export const revokeRefreshToken = async (tokenRecord) => {
  return tokenRecord.update({ revoked: true });
};

export const revokeAllRefreshTokensForUser = async (userId) => {
  const { RefreshToken } = models();
  return RefreshToken.update(
    { revoked: true },
    { where: { userId, revoked: false } },
  );
};
