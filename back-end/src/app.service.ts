import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'University Scientific Work Management API is running!';
  }

  async analyzeScientificWork(content: string) {
    // This is a placeholder for actual AI logic
    console.log('Analyzing content with AI:', content.substring(0, 50) + '...');
    
    return {
      summary: 'Dữ liệu đang được phân tích bởi AI...',
      score: Math.floor(Math.random() * 100),
      topics: ['AI', 'Research', 'Academic'],
      rank: this.calculateRank(Math.random() * 100),
    };
  }

  private calculateRank(score: number): string {
    if (score > 90) return 'Extreme';
    if (score > 70) return 'High';
    if (score > 40) return 'Medium';
    return 'Basic';
  }
}
