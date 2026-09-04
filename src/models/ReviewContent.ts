/**
 * Models for Review Mode content
 */

export interface Approach {
  id?: string;
  name: string;
  type: 'brute-force' | 'intermediate' | 'optimal';
  whenToUse: string;
  coreIntuition: string;
  steps: string[];
  timeComplexity: string;
  spaceComplexity: string;
  pitfalls?: string;
  displayOrder?: number;
}

export interface Reference {
  id?: string;
  type: 'video' | 'article';
  title: string;
  url: string;
  author?: string;
  displayOrder?: number;
}

export interface ReviewContent {
  problemId: string;
  quickRefresh: string[];
  patternName?: string;
  approaches: Approach[];
  visualBreakdown?: string;
  references: Reference[];
}

export interface AIPracticeProblem {
  id: string;
  userId: string;
  parentProblemId?: string;
  concept: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problemStatement: string;
  hints: string[];
  expectedTimeComplexity?: string;
  expectedSpaceComplexity?: string;
  sampleInput?: string;
  sampleOutput?: string;
  createdAt: Date;
}

export interface ConceptStats {
  id: string;
  userId: string;
  concept: string;
  generatedCount: number;
  reviewedCount: number;
  lastGeneratedAt?: Date;
  lastReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

