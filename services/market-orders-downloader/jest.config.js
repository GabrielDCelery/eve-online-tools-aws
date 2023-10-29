module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        //  '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
        '^.+\\.tsx?$': ['@swc/jest'],
    },
    verbose: true,
    moduleDirectories: ['node_modules'],
    testMatch: ['<rootDir>/**/*.spec.ts'],
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist', 'event-catalog'],
    collectCoverage: true,
    coveragePathIgnorePatterns: ['/node_modules/', '@types'],
    coverageReporters: ['text', 'html', 'json-summary'],
};
