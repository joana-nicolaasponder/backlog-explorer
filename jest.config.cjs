module.exports = {
  transform: {
    '^.+\\.jsx?$': 'babel-jest', // For JavaScript
    '^.+\\.tsx?$': 'ts-jest', // For TypeScript
  },
  testEnvironment: 'node',
}
