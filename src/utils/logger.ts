import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

interface LogEntry {
  timestamp: string;
  tool: string;
  modelId: string;
  durationMs: number;
  input: Record<string, unknown>;
  error?: string;
}

/** ツール呼び出しをログファイルに記録 */
export async function logToolCall(entry: LogEntry): Promise<void> {
  try {
    const logDir = config.logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `${date}.jsonl`);

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (error) {
    // ログ記録の失敗はサーバー動作に影響させない
    console.error('[logger] ログ記録失敗:', error);
  }
}
