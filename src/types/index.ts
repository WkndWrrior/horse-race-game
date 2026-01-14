export interface Horse {
  number: number;
  position: number;
  scratched?: boolean; // optional for future logic
  scratchStep?: number;
  color?: string;
  gradient?: string;
}