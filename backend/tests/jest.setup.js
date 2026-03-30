const createModelMock = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
});

const mockPrisma = {
  user: createModelMock(),
  session: createModelMock(),
  role: createModelMock(),
  policy: createModelMock(),
  group: createModelMock(),
  userRole: createModelMock(),
  userGroup: createModelMock(),
  auditLog: createModelMock(),
  notificationLog: createModelMock(),
  organizationSettings: createModelMock(),
  apiToken: createModelMock(),
  oauthAccount: createModelMock(),
  permission: createModelMock(),
  rolePermission: createModelMock(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $on: jest.fn(),
  $transaction: jest.fn(async (arg) => {
    if (typeof arg === 'function') {
      return arg(mockPrisma);
    }
    return [];
  }),
};

const mockPrismaClient = jest.fn(() => mockPrisma);

jest.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClient,
}));

jest.mock('../src/config/database', () => mockPrisma);

jest.mock('../src/utils/auditCleanup', () => ({
  scheduleCleanup: jest.fn(),
}));

global.__PRISMA_MOCK__ = mockPrisma;
