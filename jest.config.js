export default {
  testEnvironment: "node",
  transform: {},
  // services/* are separate packages with their own tests (run them from their folder).
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/services/"],
  coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/services/"],
};
