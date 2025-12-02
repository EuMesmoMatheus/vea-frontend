// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      jasmine: {
        // Configurações Jasmine
        random: false, // Desabilita execução randômica para reproduzibilidade
        failSpecWithNoExpectations: true // Falha specs sem expectations
      },
      clearContext: false // Mantém resultado do Jasmine Spec Runner visível
    },
    jasmineHtmlReporter: {
      suppressAll: true // Remove traces duplicados
    },
    // ============================================
    // Configuração de Cobertura para SonarCloud
    // ============================================
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },           // Relatório HTML para visualização
        { type: 'text-summary' },   // Resumo no console
        { type: 'lcovonly' },       // LCOV para SonarCloud
        { type: 'cobertura' }       // Cobertura XML (alternativa)
      ],
      check: {
        // Thresholds de cobertura mínima (relaxados para CI)
        global: {
          statements: 30,
          branches: 25,
          functions: 30,
          lines: 30
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome_Custom'],
    customLaunchers: {
      Chrome_Custom: {
        base: 'Chrome',
        flags: ['--disable-search-engine-choice-screen']
      },
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-translate',
          '--disable-extensions',
          '--disable-dev-shm-usage'
        ]
      }
    },
    singleRun: false,
    restartOnFileChange: true,
    // Timeout para CI
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 60000
  });
};
