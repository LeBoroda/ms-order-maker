import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest', // Используем ts-jest как пресет для TypeScript
  testEnvironment: 'jsdom', // Среда тестирования, подходит для React (браузерная)
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Расширения файлов
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest', // Трансформируем ts/tsx файлы через ts-jest
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)', // Где искать тесты
    '**/?(*.)+(spec|test).(ts|tsx|js)',
  ],
  setupFiles: ['<rootDir>/src/jest.setup-env.js'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'], // Файл для дополнительных настроек (опционально)
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Мокаем CSS модули, если используете
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json', // Путь к вашему tsconfig
    },
  },
  collectCoverage: true,
  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
  },
};

export default config;
