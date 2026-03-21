const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { getJwtSecret } = require('../config/jwt');

const prisma = new PrismaClient();

const buildDisplayName = (phone, name) => {
  if (name && name.trim()) {
    return name.trim();
  }

  return `User-${phone.slice(-4)}`;
};

const syncUserByPhone = async ({ phone, name }) => {
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser) {
    if (!existingUser.name && name) {
      return prisma.user.update({
        where: { id: existingUser.id },
        data: { name: buildDisplayName(phone, name) },
      });
    }

    return existingUser;
  }

  return prisma.user.create({
    data: {
      phone,
      name: buildDisplayName(phone, name),
    },
  });
};

const createAppSessionToken = (userId) => jwt.sign(
  { userId },
  getJwtSecret(),
  { expiresIn: '7d' },
);

module.exports = {
  syncUserByPhone,
  createAppSessionToken,
};
