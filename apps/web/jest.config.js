export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const roots = ['<rootDir>', '<rootDir>/../../__tests__'];
export const testMatch = ['**/__tests__/**/*.test.ts'];
export const collectCoverageFrom = [
    'lib/auth/**/*.ts',
    'app/api/auth/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
];
export const coverageThreshold = {
    global: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
    },
};
export const moduleNameMapper = {
    '^@/(.*)$': '<rootDir>/$1',
};
export const modulePaths = ['<rootDir>/node_modules'];
export const moduleDirectories = ['node_modules', '<rootDir>/node_modules'];
export const setupFilesAfterEnv = ['<rootDir>/../../__tests__/setup.ts'];