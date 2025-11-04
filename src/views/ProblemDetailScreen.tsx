import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import CodeEditor from '../components/CodeEditor';
import { Problem, Language } from '../models/Problem';
import { useAuth } from '../contexts/AuthContext';
import { tw, cn } from '../styles/tailwind';
import { ExecutionService } from '../services/executionService';
import { RecallService } from '../services/recallService';

interface Props {
  route: {
    params: {
      problem: Problem;
    };
  };
  navigation: any;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isVisible: boolean;
  passed?: boolean;
  actualOutput?: string;
  error?: string;
}

export default function ProblemDetailScreen({ route, navigation }: Props) {
  const { problem } = route.params;
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; output?: string; error?: string }>>({});
  const [runningTests, setRunningTests] = useState(false);

  const languages: Language[] = ['python', 'java', 'cpp'];

  // Generate test cases from problem
  const generateTestCases = (): TestCase[] => {
    const cases: TestCase[] = [];
    
    // Visible test case 1: Sample input/output
    if (problem.sample_input && problem.sample_output) {
      cases.push({
        id: 'test-1',
        input: problem.sample_input,
        expectedOutput: problem.sample_output,
        isVisible: true,
      });
    }

    // Visible test case 2 & 3: Generate variations
    if (problem.sample_input) {
      // Test case 2: Edge case (small input)
      cases.push({
        id: 'test-2',
        input: problem.sample_input.split('\n').map(line => {
          const nums = line.split(/\s+/).filter(s => s).map(Number);
          if (nums.length > 0 && !isNaN(nums[0])) {
            return nums.map(n => Math.max(1, Math.floor(n / 2))).join(' ');
          }
          return line;
        }).join('\n'),
        expectedOutput: problem.sample_output || 'Expected output',
        isVisible: true,
      });

      // Test case 3: Different input format
      cases.push({
        id: 'test-3',
        input: problem.sample_input.split('\n').slice(0, 2).join('\n') || problem.sample_input,
        expectedOutput: problem.sample_output?.split('\n').slice(0, 1).join('\n') || problem.sample_output || 'Expected output',
        isVisible: true,
      });
    }

    // Hidden test case 1 & 2
    if (problem.sample_input) {
      cases.push({
        id: 'test-hidden-1',
        input: problem.sample_input,
        expectedOutput: problem.sample_output || 'Expected output',
        isVisible: false,
      });

      cases.push({
        id: 'test-hidden-2',
        input: problem.sample_input.split('\n').reverse().join('\n'),
        expectedOutput: problem.sample_output || 'Expected output',
        isVisible: false,
      });
    }

    return cases.length >= 5 ? cases : cases.concat(Array(5 - cases.length).fill(null).map((_, i) => ({
      id: `test-fallback-${i}`,
      input: problem.sample_input || '',
      expectedOutput: problem.sample_output || '',
      isVisible: i < 3,
    })));
  };

  // Initialize test cases on mount
  useEffect(() => {
    const cases = generateTestCases();
    setTestCases(cases);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);

  // Load boilerplate code when editor opens
  useEffect(() => {
    if (showEditor) {
      setCode(getCodeTemplate(selectedLanguage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor]);

  const getLanguageDisplayName = (lang: Language) => {
    switch (lang) {
      case 'python': return 'Python';
      case 'java': return 'Java';
      case 'cpp': return 'C++';
      default: return lang;
    }
  };

  const getCodeTemplate = (lang: Language) => {
    return problem.solutions[lang] || '';
  };

  const runCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please write some code first');
      return;
    }

    setLoading(true);
    setShowOutput(true);
    try {
      const result = await ExecutionService.runCode(code, selectedLanguage);
      setOutput(result.output || '(No output)');
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async (): Promise<boolean> => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please write some code first');
      return false;
    }

    setRunningTests(true);
    const results: Record<string, { passed: boolean; output?: string; error?: string }> = {};
    let allPassed = true;

    for (const testCase of testCases) {
      try {
        const result = await ExecutionService.executeCode(
          code,
          selectedLanguage,
          testCase.input,
          testCase.expectedOutput
        );

        const passed = result.verdict === 'pass';
        results[testCase.id] = {
          passed,
          output: result.output,
          error: result.error,
        };

        if (!passed) {
          allPassed = false;
        }
      } catch (error: any) {
        results[testCase.id] = {
          passed: false,
          error: error.message,
        };
        allPassed = false;
      }
    }

    setTestResults(results);
    setRunningTests(false);
    return allPassed;
  };

  const submitSolution = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please write some code first');
      return;
    }

    setLoading(true);
    try {
      // Run all test cases first
      const allTestsPassed = await runAllTests();
      
      if (!allTestsPassed) {
        const visibleFailed = testCases.filter(tc => tc.isVisible && !testResults[tc.id]?.passed).length;
        const hiddenFailed = testCases.filter(tc => !tc.isVisible && !testResults[tc.id]?.passed).length;
        
        Alert.alert(
          'Tests Failed',
          `${visibleFailed} visible test${visibleFailed !== 1 ? 's' : ''} failed. ${hiddenFailed > 0 ? `${hiddenFailed} hidden test${hiddenFailed !== 1 ? 's' : ''} also failed.` : ''} Please fix your solution and try again.`,
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // All tests passed, submit the solution
      const response = await ExecutionService.submitSolution(
        problem.id,
        code,
        selectedLanguage,
        problem.sample_input,
        problem.sample_output
      );

      if (response.result.verdict === 'pass') {
        // Schedule recall
        await RecallService.scheduleProblemRecall(
          problem.id,
          problem.title,
          user?.plan || 'baseline'
        );
        
        // DEBUG: verify solvedAt and scheduled notifications
        try {
          const { getSolvedAt } = await import('../utils/storage');
          const solvedAt = await getSolvedAt(problem.id);
          const { NotificationService } = await import('../services/notificationService');
          const upcoming = await NotificationService.getUpcomingNotifications();
          console.log('[Recall][SolvedAt]', problem.id, solvedAt?.toISOString());
          console.log('[Recall][Upcoming]', upcoming.map(n => ({ id: n.identifier, trigger: (n.trigger as any)?.date || n.trigger }))); 
        } catch {}
        
        Alert.alert(
          'Success!',
          'All test cases passed! Your solution is correct. A recall has been scheduled.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowEditor(false);
                navigation.goBack();
              }
            }
          ]
        );
      } else if (response.result.error) {
        Alert.alert('Error', response.result.error);
      } else {
        Alert.alert('Try Again', 'Your solution does not match the expected output.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#10B981';
      case 'Medium': return '#F59E0B';
      case 'Hard': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <View style={cn(tw.flex, tw['bg-dark-950'])}>
      <ScrollView style={cn(tw.flex, tw.px(6))} showsVerticalScrollIndicator={false}>
        {/* Problem Header */}
        <View style={tw.py(6)}>
          <View style={tw.mb(2)}>
            <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(3))}>
              <View 
                style={cn(
                  tw['rounded-full'],
                  tw.px(3),
                  tw.py(1),
                  { backgroundColor: getDifficultyColor(problem.difficulty) }
                )}
              >
                <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-semibold'])}>
                  {problem.difficulty.toUpperCase()}
                </Text>
              </View>
              <View style={cn(tw['bg-dark-800'], tw['rounded-full'], tw.px(3), tw.py(1), tw.ml(2))}>
                <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-medium'])}>
                  {problem.category}
                </Text>
              </View>
            </View>
            <Text style={cn(tw['text-white'], tw['text-3xl'], tw['font-bold'], tw.mb(1))}>
              {problem.title}
            </Text>
          </View>
        </View>

        {/* Problem Description */}
        <View style={tw.mb(8)}>
          {(() => {
            const raw = problem.description || '';
            const hasNewlines = /\n/.test(raw);
            const paragraphBlocks = hasNewlines ? raw.split(/\n\n+/) : [raw];
            
            return paragraphBlocks.map((paragraph, pIndex) => {
              const trimmedPara = paragraph.trim();
              if (!trimmedPara) return null;
              
              // If no explicit newlines inside the paragraph and it's long, split into sentences for readability
              const lines = hasNewlines
                ? trimmedPara.split('\n').filter(line => line.trim())
                : trimmedPara.split(/(?<=[.!?])\s+/).filter(line => line.trim());
              
              return (
                <View key={pIndex} style={cn(pIndex > 0 ? tw.mt(2) : {})}>
                  {lines.map((line, lIndex) => {
                    const trimmedLine = line.trim();
                    const isBullet = /^[-•*]\s/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine);
                    
                    if (isBullet) {
                      const cleanText = trimmedLine.replace(/^[-•*]\s|^\d+\.\s/, '');
                      return (
                        <View key={lIndex} style={cn(tw['flex-row'], tw.mb(1), tw.ml(4))}>
                          <Text style={cn(tw['text-primary-400'], tw.mr(3), tw['text-sm'])}>•</Text>
                          <Text style={cn(tw['text-white'], tw['text-sm'], tw.leading(6), tw.flex)}>
                            {cleanText}
                          </Text>
                        </View>
                      );
                    }
                    
                    return (
                      <Text 
                        key={lIndex} 
                        style={cn(
                          tw['text-white'], 
                          tw['text-sm'], 
                          tw.leading(6),
                          lIndex > 0 ? tw.mt(1) : {}
                        )}
                      >
                        {trimmedLine}
                      </Text>
                    );
                  })}
                </View>
              );
            });
          })()}
        </View>

        {/* Sample I/O Grid */}
        <View style={tw.mb(8)}>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            <View style={tw.mb(5)}>
              <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
                SAMPLE INPUT
              </Text>
              <Text style={cn(tw['text-white'], tw['text-sm'], { fontFamily: 'monospace' })}>
                {problem.sample_input}
              </Text>
            </View>
            <View>
              <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
                EXPECTED OUTPUT
              </Text>
              <Text style={cn(tw['text-white'], tw['text-sm'], { fontFamily: 'monospace' })}>
                {problem.sample_output}
              </Text>
            </View>
          </View>
        </View>

        {/* Constraints */}
        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            CONSTRAINTS
          </Text>
          {(() => {
            const raw = problem.constraints || '';
            const hasNewlines = /\n/.test(raw);
            const paragraphBlocks = hasNewlines ? raw.split(/\n\n+/) : [raw];
            
            return paragraphBlocks.map((paragraph, pIndex) => {
              const trimmedPara = paragraph.trim();
              if (!trimmedPara) return null;
              
              const lines = hasNewlines
                ? trimmedPara.split('\n').filter(line => line.trim())
                : trimmedPara.split(/(?<=[.!?])\s+/).filter(line => line.trim());
              
              return (
                <View key={pIndex} style={cn(pIndex > 0 ? tw.mt(2) : {})}>
                  {lines.map((line, lIndex) => {
                    const trimmedLine = line.trim();
                    const isBullet = /^[-•*]\s/.test(trimmedLine) || /^\d+\.\s/.test(trimmedLine);
                    
                    if (isBullet) {
                      const cleanText = trimmedLine.replace(/^[-•*]\s|^\d+\.\s/, '');
                      return (
                        <View key={lIndex} style={cn(tw['flex-row'], tw.mb(1), tw.ml(4))}>
                          <Text style={cn(tw['text-primary-400'], tw.mr(3), tw['text-sm'])}>•</Text>
                          <Text style={cn(tw['text-white'], tw['text-sm'], tw.leading(6), tw.flex)}>
                            {cleanText}
                          </Text>
                        </View>
                      );
                    }
                    
                    return (
                      <Text
                        key={lIndex}
                        style={cn(
                          tw['text-white'],
                          tw['text-sm'],
                          tw.leading(6),
                          lIndex > 0 ? tw.mt(1) : {}
                        )}
                      >
                        {trimmedLine}
                      </Text>
                    );
                  })}
                </View>
              );
            });
          })()}
        </View>

        {/* Methods */}
        {problem.methods.length > 0 && (
          <View style={tw.mb(8)}>
            <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
              APPROACHES
            </Text>
            <View style={cn(tw['flex-row'], tw['flex-wrap'])}>
              {problem.methods.map((method, index) => (
                <View key={index} style={cn(tw['bg-primary-500/10'], tw['rounded-full'], tw.px(4), tw.py(2), tw.mr(2), tw.mb(2), tw['border'], tw['border-primary-500/20'])}>
                  <Text style={cn(tw['text-primary-400'], tw['text-xs'], tw['font-medium'])}>
                    {method}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Language Selection */}
        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['font-semibold'], tw.mb(4))}>
            LANGUAGE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={cn(
                  tw['rounded-xl'],
                  tw.px(6),
                  tw.py(3),
                  tw.mr(3),
                  tw.border,
                  selectedLanguage === lang
                    ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                    : cn(tw['border-dark-700'], tw['bg-dark-900'])
                )}
                onPress={() => {
                  setSelectedLanguage(lang);
                  setCode(getCodeTemplate(lang));
                }}
              >
                <Text style={cn(
                  tw['text-base'],
                  tw['font-semibold'],
                  selectedLanguage === lang ? tw['text-primary-500'] : tw['text-dark-400']
                )}>
                  {getLanguageDisplayName(lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Code Editor Button */}
        <View style={tw.mb(8)}>
          <TouchableOpacity
            style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}
            onPress={() => setShowEditor(true)}
          >
            <Text style={cn(tw['text-primary-500'], tw['text-base'], tw['font-bold'], tw.mb(1))}>
              Open Code Editor
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
              {getLanguageDisplayName(selectedLanguage)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={cn(tw['flex-row'], tw.mb(8))}>
          <TouchableOpacity
            style={cn(
              tw.flex,
              tw['rounded-xl'],
              tw.px(6),
              tw.py(4),
              tw.mr(2),
              tw.border,
              tw['border-dark-700'],
              tw['bg-dark-900']
            )}
            onPress={runCode}
            disabled={loading}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw['text-center'])}>
              {loading ? 'Running...' : 'Run'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={cn(
              tw.flex,
              tw['rounded-xl'],
              tw.px(6),
              tw.py(4),
              tw.ml(2),
              tw['border'],
              tw['border-primary-500'],
              tw['bg-primary-500']
            )}
            onPress={submitSolution}
            disabled={loading}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'], tw['text-center'])}>
              {loading ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Output */}
        {output && (
          <View style={tw.mb(8)}>
            <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
              OUTPUT
            </Text>
            <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
              <Text style={cn(tw['text-white'], tw['text-base'], { fontFamily: 'monospace' })}>
                {output}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Code Editor */}
      <CodeEditor
        visible={showEditor}
        code={code}
        language={selectedLanguage}
        testCases={testCases}
        testResults={testResults}
        output={output}
        showOutput={showOutput}
        loading={loading}
        runningTests={runningTests}
        onClose={() => setShowEditor(false)}
        onCodeChange={setCode}
        onRun={runCode}
        onRunTests={runAllTests}
        onSubmit={submitSolution}
        onToggleOutput={() => setShowOutput(false)}
      />
    </View>
  );
}