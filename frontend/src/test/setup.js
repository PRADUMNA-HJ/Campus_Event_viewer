import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock window.scrollTo in jsdom
window.scrollTo = vi.fn();

// Automatically clean up React DOM after each test
afterEach(() => {
  cleanup();
});
