export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TestCasePayload {
  input: string;
  expectedOutput: string;
  isVisible: boolean;
}

export interface ProblemPayload {
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  sample_input?: string;
  sample_output?: string;
  constraints?: string;
  solutions: { python: string; java: string; cpp: string; javascript: string };
  methods: string[];
  test_cases?: TestCasePayload[];
}

export function validateProblemPayload(p: any): p is ProblemPayload {
  if (!p || typeof p !== 'object') {
    console.error('Validation failed: payload is not an object', p);
    return false;
  }
  if (typeof p.title !== 'string') {
    console.error('Validation failed: title is not a string', p.title);
    return false;
  }
  if (typeof p.category !== 'string') {
    console.error('Validation failed: category is not a string', p.category);
    return false;
  }
  if (!['Easy','Medium','Hard'].includes(p.difficulty)) {
    console.error('Validation failed: difficulty is invalid', p.difficulty);
    return false;
  }
  if (typeof p.description !== 'string') {
    console.error('Validation failed: description is not a string', typeof p.description);
    return false;
  }
  if (!p.solutions || typeof p.solutions !== 'object') {
    console.error('Validation failed: solutions is not an object', p.solutions);
    return false;
  }
  if (typeof p.solutions.python !== 'string') {
    console.error('Validation failed: solutions.python is not a string', typeof p.solutions?.python);
    return false;
  }
  if (typeof p.solutions.java !== 'string') {
    console.error('Validation failed: solutions.java is not a string', typeof p.solutions?.java);
    return false;
  }
  if (typeof p.solutions.cpp !== 'string') {
    console.error('Validation failed: solutions.cpp is not a string', typeof p.solutions?.cpp);
    return false;
  }
  if (typeof p.solutions.javascript !== 'string') {
    console.error('Validation failed: solutions.javascript is not a string', typeof p.solutions?.javascript);
    return false;
  }
  if (!Array.isArray(p.methods)) {
    console.error('Validation failed: methods is not an array', typeof p.methods, p.methods);
    return false;
  }
  return true;
}
