module.exports = {
  preset: "vite-jest",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
  ],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "\\.(css|sass|scss)$": "identity-obj-proxy",
  }
};
