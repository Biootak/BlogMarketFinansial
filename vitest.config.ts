import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // transaction-guard.ts async functions chain به next-auth → جداگانه exclude
      // isHighValueTransaction (core logic) با تست مستقیم پوشش داده شده
      include: [
        'src/lib/pricing/margin.ts',
        'src/lib/pricing/auto-suggest.ts',
        'src/lib/totp.ts',
        'src/lib/customer-format.ts',
        'src/lib/exchange-hours.ts',
        'src/lib/exchange-tx-formatters.ts',
        'src/lib/rateItem.ts',
        'src/lib/setup/format.ts',
        'src/lib/setup/strength.ts',
        'src/lib/fraud/rules.ts',
        'src/lib/afn-format.ts',
        'src/lib/require-auth.ts',
        'src/lib/exchange-auth.ts',
        'src/actions/exchange-staff.ts',
        'src/actions/permission-actions.ts',
        'src/actions/settlement.ts',
        'src/actions/virtual-card.ts',
        'src/actions/transfer.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
