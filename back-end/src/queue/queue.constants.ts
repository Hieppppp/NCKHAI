/** Tên các queue */
export const QUEUE_NAMES = {
  OCR: 'ocr-processing',           // OCR + NLP extract
  AI_SUMMARIZE: 'ai-summarize',    // LLM summarize
  AI_EMBEDDING: 'ai-embedding',    // Semantic embedding (chống đạo văn)
  EMAIL: 'email-notification',     // Gửi email
  REPORT: 'report-generation',     // Tạo báo cáo PDF
} as const;
