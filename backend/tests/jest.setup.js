// Mock Prisma client before importing the app
jest.mock('../src/config/database', () => ({
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}));

jest.mock('../src/utils/auditCleanup', () => ({
  scheduleCleanup: jest.fn(),
}));
