import type { DiffFile, DiffHunk, DiffChunk, UserConfig } from './types.js';
import { shouldIgnoreFile } from './config.js';

/**
 * Parse a unified diff string into structured data
 */
export function parseDiff(diffContent: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffContent.split('\n');
  
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let hunkContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // New file header
    if (line.startsWith('diff --git')) {
      // Save previous file
      if (currentFile) {
        if (currentHunk) {
          currentHunk.content = hunkContent.join('\n');
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }
      
      // Parse file path from "diff --git a/path b/path"
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      const filePath = match ? match[2] : '';
      
      currentFile = {
        path: filePath,
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      currentHunk = null;
      hunkContent = [];
      continue;
    }
    
    // Skip file metadata lines
    if (line.startsWith('index ') || 
        line.startsWith('---') || 
        line.startsWith('+++') ||
        line.startsWith('new file') ||
        line.startsWith('deleted file') ||
        line.startsWith('similarity index') ||
        line.startsWith('rename from') ||
        line.startsWith('rename to') ||
        line.startsWith('Binary files')) {
      continue;
    }
    
    // Hunk header
    if (line.startsWith('@@')) {
      // Save previous hunk
      if (currentHunk && currentFile) {
        currentHunk.content = hunkContent.join('\n');
        currentFile.hunks.push(currentHunk);
      }
      
      // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1], 10),
          oldLines: parseInt(match[2] || '1', 10),
          newStart: parseInt(match[3], 10),
          newLines: parseInt(match[4] || '1', 10),
          content: '',
        };
      }
      hunkContent = [line]; // Include the @@ line
      continue;
    }
    
    // Content lines
    if (currentHunk) {
      hunkContent.push(line);
      
      if (line.startsWith('+') && !line.startsWith('+++')) {
        if (currentFile) currentFile.additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        if (currentFile) currentFile.deletions++;
      }
    }
  }
  
  // Save last file
  if (currentFile) {
    if (currentHunk) {
      currentHunk.content = hunkContent.join('\n');
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }
  
  return files;
}

/**
 * Filter files based on user configuration
 */
export function filterFiles(files: DiffFile[], config: UserConfig): DiffFile[] {
  return files.filter(file => !shouldIgnoreFile(file.path, config));
}

/**
 * Calculate the total size of a diff in lines
 */
export function calculateDiffSize(files: DiffFile[]): number {
  return files.reduce((total, file) => total + file.additions + file.deletions, 0);
}

/**
 * Split files into chunks for processing large PRs
 */
export function splitIntoChunks(
  files: DiffFile[], 
  maxChunkSize: number = 3000
): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let currentChunk: DiffFile[] = [];
  let currentSize = 0;
  
  for (const file of files) {
    const fileSize = file.additions + file.deletions;
    
    // If single file is larger than max, it goes in its own chunk
    if (fileSize > maxChunkSize) {
      // Save current chunk if not empty
      if (currentChunk.length > 0) {
        chunks.push({
          files: currentChunk,
          totalLines: currentSize,
        });
        currentChunk = [];
        currentSize = 0;
      }
      
      chunks.push({
        files: [file],
        totalLines: fileSize,
      });
      continue;
    }
    
    // Check if adding this file would exceed the limit
    if (currentSize + fileSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        files: currentChunk,
        totalLines: currentSize,
      });
      currentChunk = [];
      currentSize = 0;
    }
    
    currentChunk.push(file);
    currentSize += fileSize;
  }
  
  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      files: currentChunk,
      totalLines: currentSize,
    });
  }
  
  return chunks;
}

/**
 * Convert parsed diff files back to diff string format
 */
export function filesToDiffString(files: DiffFile[]): string {
  const parts: string[] = [];
  
  for (const file of files) {
    parts.push(`diff --git a/${file.path} b/${file.path}`);
    parts.push(`--- a/${file.path}`);
    parts.push(`+++ b/${file.path}`);
    
    for (const hunk of file.hunks) {
      parts.push(hunk.content);
    }
  }
  
  return parts.join('\n');
}

/**
 * Limit files to max count
 */
export function limitFiles(files: DiffFile[], maxFiles: number): DiffFile[] {
  if (files.length <= maxFiles) {
    return files;
  }
  
  // Sort by size (larger files first, they're usually more important)
  const sorted = [...files].sort(
    (a, b) => (b.additions + b.deletions) - (a.additions + a.deletions)
  );
  
  return sorted.slice(0, maxFiles);
}

/**
 * Get the line number from a hunk for a specific change
 */
export function getLineNumber(hunk: DiffHunk, changeIndex: number): number {
  const lines = hunk.content.split('\n');
  let lineNumber = hunk.newStart;
  
  for (let i = 1; i <= changeIndex && i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('-')) {
      lineNumber++;
    }
  }
  
  return lineNumber;
}

