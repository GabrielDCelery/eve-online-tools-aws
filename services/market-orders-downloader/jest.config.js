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
    testPathIgnorePatterns: ['<rootDir>/node_modules', '<rootDir>/dist'],
};
