/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
    // Keep your Node environment for your auth tests
    // NOTE: If the whole project is a monorepo, you might need to keep jsdom 
    // but for Auth functions, 'node' is better.
    testEnvironment: 'jsdom', 
    preset: 'ts-jest',
    
    // Combine the roots and setup files
    roots: ['<rootDir>/__tests__'],
    setupFilesAfterEnv: ['./jest.setup.js', '<rootDir>/__tests__/setup.ts'],
    
    // Use their more inclusive test match, but keep your coverage rules
    testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
    
    // Keep your strict coverage thresholds
    collectCoverageFrom: [
        'lib/auth/**/*.ts',
        'app/api/auth/**/*.ts',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },

    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },

    // Allow resolving dependencies installed either locally or hoisted to the workspace root
    moduleDirectories: ['node_modules', '<rootDir>/node_modules', '<rootDir>/../../node_modules'],

    // Ignore helper directories that live under __tests__ but do not define test cases
    testPathIgnorePatterns: ['<rootDir>/__tests__/fixtures/'],

    // Keep their specific transform settings to avoid breaking React builds
    transform: {
        '^.+\\.(ts|tsx|js|mjs|jsx)$': ['ts-jest', { 
            tsconfig: { 
                jsx: 'react-jsx', 
                module: 'commonjs', 
                target: 'es2022', 
                allowJs: true 
            } 
        }],
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(@faker-js/faker)/)'
    ],
};

module.exports = config;
