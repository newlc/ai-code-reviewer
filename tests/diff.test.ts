import { describe, it, expect } from 'vitest';
import { 
  parseDiff, 
  filterFiles, 
  splitIntoChunks, 
  filesToDiffString,
  calculateDiffSize,
  limitFiles 
} from '../src/diff.js';
import type { UserConfig } from '../src/types.js';

const sampleDiff = `diff --git a/src/utils.ts b/src/utils.ts
index 1234567..abcdefg 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -10,6 +10,8 @@ export function helper() {
   const x = 1;
+  const y = 2;
+  const z = x + y;
   return x;
 }
diff --git a/src/main.ts b/src/main.ts
index 2345678..bcdefgh 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,5 +1,4 @@
 import { helper } from './utils';
-import { unused } from './legacy';
 
 export function main() {
   return helper();
`;

describe('parseDiff', () => {
  it('should parse a simple diff', () => {
    const files = parseDiff(sampleDiff);
    
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('src/utils.ts');
    expect(files[1].path).toBe('src/main.ts');
  });

  it('should count additions and deletions', () => {
    const files = parseDiff(sampleDiff);
    
    expect(files[0].additions).toBe(2);
    expect(files[0].deletions).toBe(0);
    expect(files[1].additions).toBe(0);
    expect(files[1].deletions).toBe(1);
  });

  it('should parse hunks correctly', () => {
    const files = parseDiff(sampleDiff);
    
    expect(files[0].hunks).toHaveLength(1);
    expect(files[0].hunks[0].oldStart).toBe(10);
    expect(files[0].hunks[0].newStart).toBe(10);
  });

  it('should handle empty diff', () => {
    const files = parseDiff('');
    expect(files).toHaveLength(0);
  });
});

describe('filterFiles', () => {
  const config: UserConfig = {
    ignore: ['*.min.js', '**/node_modules/**', 'package-lock.json'],
    include_only: undefined,
  };

  it('should filter out ignored files', () => {
    const files = [
      { path: 'src/app.ts', additions: 10, deletions: 5, hunks: [] },
      { path: 'dist/bundle.min.js', additions: 100, deletions: 0, hunks: [] },
      { path: 'package-lock.json', additions: 500, deletions: 200, hunks: [] },
    ];
    
    const filtered = filterFiles(files, config);
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].path).toBe('src/app.ts');
  });

  it('should apply include_only filter', () => {
    const configWithInclude: UserConfig = {
      ignore: [],
      include_only: ['src/**'],
    };
    
    const files = [
      { path: 'src/app.ts', additions: 10, deletions: 5, hunks: [] },
      { path: 'tests/app.test.ts', additions: 20, deletions: 10, hunks: [] },
    ];
    
    const filtered = filterFiles(files, configWithInclude);
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].path).toBe('src/app.ts');
  });
});

describe('splitIntoChunks', () => {
  it('should create single chunk for small diffs', () => {
    const files = [
      { path: 'a.ts', additions: 10, deletions: 5, hunks: [] },
      { path: 'b.ts', additions: 20, deletions: 10, hunks: [] },
    ];
    
    const chunks = splitIntoChunks(files, 1000);
    
    expect(chunks).toHaveLength(1);
    expect(chunks[0].files).toHaveLength(2);
    expect(chunks[0].totalLines).toBe(45);
  });

  it('should split large diffs into multiple chunks', () => {
    const files = [
      { path: 'a.ts', additions: 100, deletions: 50, hunks: [] },
      { path: 'b.ts', additions: 200, deletions: 100, hunks: [] },
      { path: 'c.ts', additions: 150, deletions: 75, hunks: [] },
    ];
    
    const chunks = splitIntoChunks(files, 200);
    
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should put large single file in its own chunk', () => {
    const files = [
      { path: 'small.ts', additions: 10, deletions: 5, hunks: [] },
      { path: 'large.ts', additions: 1000, deletions: 500, hunks: [] },
      { path: 'another.ts', additions: 20, deletions: 10, hunks: [] },
    ];
    
    const chunks = splitIntoChunks(files, 100);
    
    // large.ts should be in its own chunk
    const largeChunk = chunks.find(c => 
      c.files.length === 1 && c.files[0].path === 'large.ts'
    );
    expect(largeChunk).toBeDefined();
  });
});

describe('calculateDiffSize', () => {
  it('should calculate total diff size', () => {
    const files = [
      { path: 'a.ts', additions: 10, deletions: 5, hunks: [] },
      { path: 'b.ts', additions: 20, deletions: 10, hunks: [] },
    ];
    
    expect(calculateDiffSize(files)).toBe(45);
  });

  it('should return 0 for empty files', () => {
    expect(calculateDiffSize([])).toBe(0);
  });
});

describe('limitFiles', () => {
  it('should not limit when under max', () => {
    const files = [
      { path: 'a.ts', additions: 10, deletions: 5, hunks: [] },
      { path: 'b.ts', additions: 20, deletions: 10, hunks: [] },
    ];
    
    const limited = limitFiles(files, 10);
    
    expect(limited).toHaveLength(2);
  });

  it('should limit to max files, keeping largest', () => {
    const files = [
      { path: 'small.ts', additions: 5, deletions: 2, hunks: [] },
      { path: 'large.ts', additions: 100, deletions: 50, hunks: [] },
      { path: 'medium.ts', additions: 30, deletions: 15, hunks: [] },
    ];
    
    const limited = limitFiles(files, 2);
    
    expect(limited).toHaveLength(2);
    expect(limited.find(f => f.path === 'large.ts')).toBeDefined();
    expect(limited.find(f => f.path === 'medium.ts')).toBeDefined();
  });
});

describe('filesToDiffString', () => {
  it('should convert files back to diff format', () => {
    const files = parseDiff(sampleDiff);
    const diffString = filesToDiffString(files);
    
    expect(diffString).toContain('diff --git');
    expect(diffString).toContain('src/utils.ts');
    expect(diffString).toContain('src/main.ts');
  });
});

