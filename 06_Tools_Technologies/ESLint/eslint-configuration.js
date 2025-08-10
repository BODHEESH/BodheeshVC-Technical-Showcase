/**
 * ESLint Configuration and Code Quality Setup
 * Demonstrating code linting, formatting, and quality enforcement
 * Author: Bodheesh VC
 */

// .eslintrc.js - Main ESLint configuration
const eslintConfig = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
        'prettier' // Must be last to override other configs
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
    },
    plugins: [
        'react',
        'react-hooks',
        '@typescript-eslint',
        'jsx-a11y',
        'import',
        'security',
        'sonarjs'
    ],
    rules: {
        // JavaScript/TypeScript rules
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-unused-vars': 'off', // Handled by TypeScript
        '@typescript-eslint/no-unused-vars': ['error', { 
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_'
        }],
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/prefer-const': 'error',
        '@typescript-eslint/no-var-requires': 'error',

        // Code quality rules
        'complexity': ['warn', 10],
        'max-depth': ['warn', 4],
        'max-lines': ['warn', 300],
        'max-lines-per-function': ['warn', 50],
        'max-params': ['warn', 4],
        'no-magic-numbers': ['warn', { 
            ignore: [-1, 0, 1, 2],
            ignoreArrayIndexes: true
        }],

        // React specific rules
        'react/react-in-jsx-scope': 'off', // Not needed in React 17+
        'react/prop-types': 'off', // Using TypeScript instead
        'react/jsx-uses-react': 'off',
        'react/jsx-uses-vars': 'error',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        // Accessibility rules
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/role-has-required-aria-props': 'error',

        // Import rules
        'import/order': ['error', {
            groups: [
                'builtin',
                'external',
                'internal',
                'parent',
                'sibling',
                'index'
            ],
            'newlines-between': 'always',
            alphabetize: {
                order: 'asc',
                caseInsensitive: true
            }
        }],
        'import/no-unresolved': 'error',
        'import/no-cycle': 'error',

        // Security rules
        'security/detect-object-injection': 'warn',
        'security/detect-non-literal-regexp': 'warn',
        'security/detect-unsafe-regex': 'error',
        'security/detect-buffer-noassert': 'error',
        'security/detect-eval-with-expression': 'error',

        // SonarJS rules for code quality
        'sonarjs/cognitive-complexity': ['error', 15],
        'sonarjs/no-duplicate-string': ['error', 3],
        'sonarjs/no-identical-functions': 'error',
        'sonarjs/prefer-immediate-return': 'error'
    },
    settings: {
        react: {
            version: 'detect'
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: './tsconfig.json'
            }
        }
    },
    overrides: [
        {
            files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
            env: {
                jest: true
            },
            rules: {
                'no-magic-numbers': 'off',
                'max-lines-per-function': 'off'
            }
        },
        {
            files: ['**/*.config.{js,ts}', '**/webpack.*.{js,ts}'],
            rules: {
                'no-console': 'off',
                '@typescript-eslint/no-var-requires': 'off'
            }
        }
    ]
};

// Prettier configuration (.prettierrc.js)
const prettierConfig = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'avoid',
    endOfLine: 'lf',
    embeddedLanguageFormatting: 'auto'
};

// Custom ESLint rules for portfolio project
const customRules = {
    // Custom rule to enforce consistent naming conventions
    'portfolio/consistent-naming': {
        meta: {
            type: 'suggestion',
            docs: {
                description: 'Enforce consistent naming conventions for portfolio components',
                category: 'Stylistic Issues'
            },
            schema: []
        },
        create(context) {
            return {
                VariableDeclarator(node) {
                    if (node.id.type === 'Identifier') {
                        const name = node.id.name;
                        
                        // Check for component naming
                        if (name.match(/^[A-Z]/) && !name.match(/^[A-Z][a-zA-Z]*$/)) {
                            context.report({
                                node: node.id,
                                message: 'Component names should be PascalCase'
                            });
                        }
                        
                        // Check for constant naming
                        if (name.match(/^[A-Z_]+$/) && name.length < 3) {
                            context.report({
                                node: node.id,
                                message: 'Constants should be descriptive (min 3 characters)'
                            });
                        }
                    }
                }
            };
        }
    }
};

// ESLint CLI integration class
class ESLintService {
    constructor(options = {}) {
        this.configPath = options.configPath || '.eslintrc.js';
        this.ignorePath = options.ignorePath || '.eslintignore';
        this.extensions = options.extensions || ['.js', '.jsx', '.ts', '.tsx'];
    }

    // 1. Lint specific files
    async lintFiles(filePaths) {
        const { ESLint } = require('eslint');
        
        const eslint = new ESLint({
            baseConfig: eslintConfig,
            useEslintrc: false,
            extensions: this.extensions
        });

        try {
            const results = await eslint.lintFiles(filePaths);
            const formatter = await eslint.loadFormatter('stylish');
            const resultText = formatter.format(results);

            // Count errors and warnings
            const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0);
            const warningCount = results.reduce((sum, result) => sum + result.warningCount, 0);

            console.log('🔍 ESLint Results:');
            console.log(resultText);
            console.log(`📊 Summary: ${errorCount} errors, ${warningCount} warnings`);

            return {
                success: errorCount === 0,
                results,
                errorCount,
                warningCount,
                output: resultText
            };

        } catch (error) {
            console.error('❌ ESLint failed:', error);
            throw error;
        }
    }

    // 2. Auto-fix issues
    async fixFiles(filePaths) {
        const { ESLint } = require('eslint');
        
        const eslint = new ESLint({
            baseConfig: eslintConfig,
            useEslintrc: false,
            fix: true
        });

        try {
            const results = await eslint.lintFiles(filePaths);
            await ESLint.outputFixes(results);

            const fixedCount = results.reduce((sum, result) => 
                sum + (result.output ? 1 : 0), 0
            );

            console.log(`🔧 Auto-fixed ${fixedCount} files`);
            return { success: true, fixedCount };

        } catch (error) {
            console.error('❌ Auto-fix failed:', error);
            throw error;
        }
    }

    // 3. Generate quality report
    async generateQualityReport(projectPath) {
        const results = await this.lintFiles([`${projectPath}/**/*.{js,jsx,ts,tsx}`]);
        
        const report = {
            timestamp: new Date().toISOString(),
            projectPath,
            summary: {
                totalFiles: results.results.length,
                errorCount: results.errorCount,
                warningCount: results.warningCount,
                fixableErrorCount: results.results.reduce((sum, result) => 
                    sum + result.fixableErrorCount, 0
                ),
                fixableWarningCount: results.results.reduce((sum, result) => 
                    sum + result.fixableWarningCount, 0
                )
            },
            ruleViolations: this.analyzeRuleViolations(results.results),
            fileAnalysis: results.results.map(result => ({
                filePath: result.filePath,
                errorCount: result.errorCount,
                warningCount: result.warningCount,
                messages: result.messages.map(msg => ({
                    rule: msg.ruleId,
                    severity: msg.severity === 2 ? 'error' : 'warning',
                    message: msg.message,
                    line: msg.line,
                    column: msg.column
                }))
            }))
        };

        return report;
    }

    analyzeRuleViolations(results) {
        const violations = new Map();

        results.forEach(result => {
            result.messages.forEach(message => {
                if (message.ruleId) {
                    if (!violations.has(message.ruleId)) {
                        violations.set(message.ruleId, {
                            rule: message.ruleId,
                            count: 0,
                            severity: message.severity === 2 ? 'error' : 'warning'
                        });
                    }
                    violations.get(message.ruleId).count++;
                }
            });
        });

        return Array.from(violations.values())
            .sort((a, b) => b.count - a.count);
    }

    // 4. Pre-commit hook integration
    generatePreCommitHook() {
        return `#!/bin/sh
# Pre-commit hook for ESLint
# Place this file in .git/hooks/pre-commit and make it executable

echo "🔍 Running ESLint on staged files..."

# Get list of staged JavaScript/TypeScript files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(js|jsx|ts|tsx)$")

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No JavaScript/TypeScript files to lint"
    exit 0
fi

# Run ESLint on staged files
npx eslint $STAGED_FILES

ESLINT_EXIT_CODE=$?

if [ $ESLINT_EXIT_CODE -ne 0 ]; then
    echo "❌ ESLint found issues. Please fix them before committing."
    echo "💡 Run 'npx eslint $STAGED_FILES --fix' to auto-fix some issues"
    exit 1
fi

echo "✅ ESLint passed!"
exit 0`;
    }

    // 5. CI/CD Integration
    generateGitHubActionsWorkflow() {
        return `name: Code Quality Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run ESLint
      run: |
        npx eslint . --ext .js,.jsx,.ts,.tsx --format json --output-file eslint-report.json
        npx eslint . --ext .js,.jsx,.ts,.tsx --format stylish
    
    - name: Upload ESLint report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: eslint-report
        path: eslint-report.json
    
    - name: Comment PR with ESLint results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const eslintReport = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
          
          const errorCount = eslintReport.reduce((sum, result) => sum + result.errorCount, 0);
          const warningCount = eslintReport.reduce((sum, result) => sum + result.warningCount, 0);
          
          const comment = \`## 🔍 ESLint Results
          
          - **Errors:** \${errorCount}
          - **Warnings:** \${warningCount}
          - **Files checked:** \${eslintReport.length}
          
          \${errorCount === 0 ? '✅ No errors found!' : '❌ Please fix the errors before merging.'}\`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });`;
    }
}

// Package.json scripts for ESLint integration
const packageJsonScripts = {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "lint:report": "eslint . --ext .js,.jsx,.ts,.tsx --format json --output-file reports/eslint-report.json",
    "lint:ci": "eslint . --ext .js,.jsx,.ts,.tsx --format junit --output-file reports/eslint-junit.xml",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "quality:check": "npm run lint && npm run format:check",
    "quality:fix": "npm run lint:fix && npm run format"
};

// ESLint ignore patterns (.eslintignore)
const eslintIgnorePatterns = `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
build/
dist/
out/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Logs
logs/
*.log

# Cache
.cache/
.parcel-cache/

# Generated files
*.generated.js
*.generated.ts
`;

// Advanced ESLint configuration for different environments
class ESLintConfigManager {
    constructor() {
        this.environments = {
            development: this.getDevelopmentConfig(),
            production: this.getProductionConfig(),
            testing: this.getTestingConfig()
        };
    }

    getDevelopmentConfig() {
        return {
            ...eslintConfig,
            rules: {
                ...eslintConfig.rules,
                'no-console': 'off', // Allow console in development
                'no-debugger': 'warn', // Warn instead of error
                '@typescript-eslint/no-explicit-any': 'warn'
            }
        };
    }

    getProductionConfig() {
        return {
            ...eslintConfig,
            rules: {
                ...eslintConfig.rules,
                'no-console': 'error', // Strict in production
                'no-debugger': 'error',
                '@typescript-eslint/no-explicit-any': 'error',
                'complexity': ['error', 8] // Lower complexity threshold
            }
        };
    }

    getTestingConfig() {
        return {
            ...eslintConfig,
            env: {
                ...eslintConfig.env,
                jest: true,
                mocha: true
            },
            rules: {
                ...eslintConfig.rules,
                'max-lines-per-function': 'off', // Tests can be longer
                'no-magic-numbers': 'off', // Test data can have magic numbers
                'sonarjs/no-duplicate-string': 'off' // Test descriptions can repeat
            }
        };
    }

    getConfigForEnvironment(env) {
        return this.environments[env] || this.environments.development;
    }
}

// Code quality metrics analyzer
class CodeQualityAnalyzer {
    constructor(eslintService) {
        this.eslintService = eslintService;
    }

    async analyzeCodebase(projectPath) {
        const report = await this.eslintService.generateQualityReport(projectPath);
        
        const metrics = {
            codeQualityScore: this.calculateQualityScore(report),
            maintainabilityIndex: this.calculateMaintainabilityIndex(report),
            technicalDebt: this.calculateTechnicalDebt(report),
            recommendations: this.generateRecommendations(report)
        };

        return {
            ...report,
            metrics
        };
    }

    calculateQualityScore(report) {
        const { totalFiles, errorCount, warningCount } = report.summary;
        const totalIssues = errorCount + warningCount;
        
        if (totalFiles === 0) return 100;
        
        const issuesPerFile = totalIssues / totalFiles;
        const score = Math.max(0, 100 - (issuesPerFile * 10));
        
        return Math.round(score);
    }

    calculateMaintainabilityIndex(report) {
        // Simplified maintainability calculation
        const complexityViolations = report.ruleViolations
            .filter(v => v.rule.includes('complexity'))
            .reduce((sum, v) => sum + v.count, 0);
        
        const duplicateViolations = report.ruleViolations
            .filter(v => v.rule.includes('duplicate'))
            .reduce((sum, v) => sum + v.count, 0);

        const baseScore = 100;
        const complexityPenalty = complexityViolations * 5;
        const duplicatePenalty = duplicateViolations * 3;

        return Math.max(0, baseScore - complexityPenalty - duplicatePenalty);
    }

    calculateTechnicalDebt(report) {
        const { errorCount, warningCount, fixableErrorCount, fixableWarningCount } = report.summary;
        
        // Estimate time to fix issues (in hours)
        const errorTime = errorCount * 0.5; // 30 minutes per error
        const warningTime = warningCount * 0.25; // 15 minutes per warning
        const autoFixTime = (fixableErrorCount + fixableWarningCount) * 0.1; // 6 minutes for auto-fixable

        return {
            totalHours: Math.round((errorTime + warningTime - autoFixTime) * 10) / 10,
            autoFixableHours: Math.round(autoFixTime * 10) / 10,
            manualFixHours: Math.round((errorTime + warningTime - autoFixTime) * 10) / 10
        };
    }

    generateRecommendations(report) {
        const recommendations = [];
        
        if (report.summary.errorCount > 0) {
            recommendations.push({
                priority: 'high',
                message: `Fix ${report.summary.errorCount} ESLint errors`,
                action: 'Run npm run lint:fix to auto-fix some issues'
            });
        }

        if (report.summary.warningCount > 10) {
            recommendations.push({
                priority: 'medium',
                message: `Address ${report.summary.warningCount} warnings`,
                action: 'Review and fix warning-level issues'
            });
        }

        const topViolations = report.ruleViolations.slice(0, 3);
        topViolations.forEach(violation => {
            recommendations.push({
                priority: violation.severity === 'error' ? 'high' : 'medium',
                message: `Most common issue: ${violation.rule} (${violation.count} occurrences)`,
                action: `Focus on fixing ${violation.rule} violations`
            });
        });

        return recommendations;
    }
}

// Usage example
async function demonstrateESLint() {
    console.log('🔍 ESLint Code Quality Demo');
    
    const eslintService = new ESLintService();
    const configManager = new ESLintConfigManager();
    const qualityAnalyzer = new CodeQualityAnalyzer(eslintService);

    try {
        // Example: Lint specific files
        const filesToLint = [
            './src/components/Header.tsx',
            './src/utils/helpers.js',
            './src/services/api.ts'
        ];

        console.log('📁 Linting files:', filesToLint);
        const lintResults = await eslintService.lintFiles(filesToLint);

        if (!lintResults.success) {
            console.log('🔧 Attempting auto-fix...');
            await eslintService.fixFiles(filesToLint);
        }

        // Generate quality report
        const qualityReport = await qualityAnalyzer.analyzeCodebase('./src');
        
        console.log('📊 Code Quality Metrics:');
        console.log(`- Quality Score: ${qualityReport.metrics.codeQualityScore}/100`);
        console.log(`- Maintainability Index: ${qualityReport.metrics.maintainabilityIndex}/100`);
        console.log(`- Technical Debt: ${qualityReport.metrics.technicalDebt.totalHours} hours`);

        // Show recommendations
        console.log('💡 Recommendations:');
        qualityReport.metrics.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
            console.log(`   Action: ${rec.action}`);
        });

        // Get environment-specific config
        const prodConfig = configManager.getConfigForEnvironment('production');
        console.log('⚙️ Production config loaded with stricter rules');

    } catch (error) {
        console.error('❌ ESLint demonstration failed:', error);
    }
}

module.exports = {
    eslintConfig,
    prettierConfig,
    customRules,
    packageJsonScripts,
    eslintIgnorePatterns,
    ESLintService,
    ESLintConfigManager,
    CodeQualityAnalyzer,
    demonstrateESLint
};

// Export configurations for use in actual .eslintrc.js files
module.exports.eslintConfig = eslintConfig;
module.exports.prettierConfig = prettierConfig;

// Run demonstration if executed directly
if (require.main === module) {
    demonstrateESLint();
}
