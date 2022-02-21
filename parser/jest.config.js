// eslint-disable-next-line no-undef
module.exports = {
  preset: "ts-jest",
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  roots: ["<rootDir>/src/"]
};
