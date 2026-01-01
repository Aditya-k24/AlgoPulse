import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import CodeEditor from '../components/CodeEditor';
import { Problem, Language, TestCase } from '../models/Problem';
import { useAuth } from '../contexts/AuthContext';
import { tw, cn } from '../styles/tailwind';
import { ExecutionService } from '../services/executionService';
import { RecallService } from '../services/recallService';
import { getBoilerplateTemplate, extractSolutionFunction, getMainExecutionCode } from '../utils/codeTemplates';

interface Props {
  route: {
    params: {
      problem: Problem;
    };
  };
  navigation: any;
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

  // Generate test cases from problem (fallback if not stored)
  const generateTestCases = (): TestCase[] => {
    // If problem has stored test cases, use them
    if (problem.test_cases && problem.test_cases.length > 0) {
      return problem.test_cases.map((tc, index) => ({
        ...tc,
        id: tc.id || `test-${index + 1}`,
      }));
    }

    // Otherwise, generate from sample input/output (fallback)
    const cases: TestCase[] = [];
    
    if (problem.sample_input && problem.sample_output) {
      cases.push({
        id: 'test-1',
        input: problem.sample_input,
        expectedOutput: problem.sample_output,
        isVisible: true,
      });
    }

    if (problem.sample_input) {
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

      cases.push({
        id: 'test-3',
        input: problem.sample_input.split('\n').slice(0, 2).join('\n') || problem.sample_input,
        expectedOutput: problem.sample_output?.split('\n').slice(0, 1).join('\n') || problem.sample_output || 'Expected output',
        isVisible: true,
      });

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
    const solution = problem.solutions[lang];
    
    if (!solution || !solution.trim()) {
      // No solution exists, return minimal skeleton
      return getBoilerplateTemplate(lang, problem.sample_input);
    }
    
    // Extract only the solve function (remove main execution code)
    return extractSolutionFunction(lang, solution) || getBoilerplateTemplate(lang, problem.sample_input);
  };

  const combineCodeWithMain = (solveCode: string, lang: Language): string => {
    switch (lang) {
      case 'python':
        // Check if main already exists
        if (solveCode.includes('if __name__')) {
          return solveCode;
        }
        // Check if solve function exists
        if (solveCode.includes('def solve(')) {
          return `${solveCode}\n\n${getMainExecutionCode(lang)}`;
        }
        // Wrap in solve function if it's just code
        return `def solve(input_data):\n    ${solveCode.split('\n').join('\n    ')}\n    return ""\n\n${getMainExecutionCode(lang)}`;
      
      case 'java':
        // Check if main already exists
        if (solveCode.includes('public static void main')) {
          return solveCode;
        }
        // Check if class exists
        if (solveCode.includes('public class Solution')) {
          // Check if solve method exists
          if (solveCode.includes('public static String solve(')) {
            // Insert main method before the closing brace
            const lastBrace = solveCode.lastIndexOf('}');
            const beforeLastBrace = solveCode.substring(0, lastBrace);
            // Make sure Scanner is imported
            const hasScannerImport = solveCode.includes('import java.util.Scanner') || solveCode.includes('import java.util.*');
            const mainCode = getMainExecutionCode(lang);
            if (hasScannerImport) {
              return `${beforeLastBrace}\n    \n    ${mainCode}\n}`;
            } else {
              // Add Scanner import at the beginning
              const importIndex = solveCode.indexOf('import');
              if (importIndex === -1) {
                // No imports, add at the beginning
                const classIndex = solveCode.indexOf('public class');
                const beforeClass = solveCode.substring(0, classIndex);
                const afterClass = solveCode.substring(classIndex);
                const lastBrace2 = afterClass.lastIndexOf('}');
                return `${beforeClass}import java.util.Scanner;\n\n${afterClass.substring(0, lastBrace2)}\n    \n    ${mainCode}\n}`;
              } else {
                // Add after existing imports
                const firstBrace = solveCode.indexOf('{');
                const imports = solveCode.substring(0, firstBrace);
                const classBody = solveCode.substring(firstBrace);
                const lastBrace2 = classBody.lastIndexOf('}');
                return `${imports}import java.util.Scanner;\n${classBody.substring(0, lastBrace2)}\n    \n    ${mainCode}\n}`;
              }
            }
          } else {
            // Add solve method and main
            const lastBrace = solveCode.lastIndexOf('}');
            const mainCode = getMainExecutionCode(lang);
            return solveCode.substring(0, lastBrace) + `\n    public static String solve(String inputData) {\n        // TODO: Implement\n        return "";\n    }\n    \n    ${mainCode}\n}`;
          }
        }
        // No class, create full structure
        const mainCode = getMainExecutionCode(lang);
        return `import java.util.Scanner;\n\npublic class Solution {\n    public static String solve(String inputData) {\n        // TODO: Implement\n        return "";\n    }\n    \n    ${mainCode}\n}`;
      
      case 'cpp':
        // Check if main already exists
        if (solveCode.includes('int main(') || solveCode.includes('void main(')) {
          return solveCode;
        }
        // Check if includes exist
        const hasIncludes = solveCode.includes('#include');
        const hasSolveFunction = solveCode.includes('string solve(');
        const includes = hasIncludes ? '' : '#include <iostream>\n#include <string>\n#include <sstream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\n';
        
        if (hasSolveFunction) {
          return `${includes}${solveCode}\n\n${getMainExecutionCode(lang)}`;
        } else {
          // Add solve function
          return `${includes}string solve(string input) {\n    // TODO: Implement\n    return "";\n}\n\n${getMainExecutionCode(lang)}`;
        }
      
      default:
        return solveCode;
    }
  };

  const runCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please write some code first');
      return;
    }

    setLoading(true);
    setShowOutput(true);
    try {
      // Combine solve function with main execution code
      const fullCode = combineCodeWithMain(code, selectedLanguage);
      console.log('[RunCode] Combined code:', fullCode.substring(0, 200) + '...');
      
      // Use sample input if available, otherwise run without input
      const input = problem.sample_input || '';
      console.log('[RunCode] Input:', input);
      
      const result = await ExecutionService.executeCode(fullCode, selectedLanguage, input);
      console.log('[RunCode] Result:', result);
      
      if (result.error) {
        setOutput(`❌ Error: ${result.error}\n\nOutput: ${result.output || '(No output)'}`);
      } else {
        const expectedOutput = problem.sample_output || '';
        const outputText = result.output || '(No output)';
        const actualOutput = outputText.trim();
        const expectedOutputTrimmed = expectedOutput.trim();
        const matches = expectedOutput && actualOutput === expectedOutputTrimmed;
        
        setOutput(
          `📤 Your Output:\n${outputText}\n\n${expectedOutput ? `✅ Expected Output:\n${expectedOutput}\n\n${matches ? '✓✓✓ Perfect Match! ✓✓✓' : '✗ Output does not match expected'}` : 'ℹ️ No expected output to compare'}`
        );
      }
    } catch (error: any) {
      console.error('[RunCode] Error:', error);
      setOutput(`❌ Execution Error: ${error.message || 'Unknown error'}`);
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
    setShowOutput(true);
    const results: Record<string, { passed: boolean; output?: string; error?: string }> = {};
    let allPassed = true;
    let testOutput = '🧪 Running Tests...\n\n';

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const isVisible = testCase.isVisible;
      const testLabel = isVisible ? `Test ${i + 1}` : `Hidden Test ${i + 1}`;
      
      try {
        // Combine solve function with main execution code
        const fullCode = combineCodeWithMain(code, selectedLanguage);
        console.log(`[RunAllTests] Running ${testLabel}, input:`, testCase.input);
        
        const result = await ExecutionService.executeCode(
          fullCode,
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

        if (isVisible) {
          testOutput += `${passed ? '✅' : '❌'} ${testLabel}: ${passed ? 'PASSED' : 'FAILED'}\n`;
          if (!passed) {
            testOutput += `   Input: ${testCase.input.substring(0, 50)}${testCase.input.length > 50 ? '...' : ''}\n`;
            testOutput += `   Your Output: ${result.output?.substring(0, 50) || '(no output)'}${result.output && result.output.length > 50 ? '...' : ''}\n`;
            testOutput += `   Expected: ${testCase.expectedOutput.substring(0, 50)}${testCase.expectedOutput.length > 50 ? '...' : ''}\n`;
            if (result.error) {
              testOutput += `   Error: ${result.error}\n`;
            }
          }
        } else {
          // For hidden tests, just show pass/fail
          testOutput += `${passed ? '✅' : '❌'} ${testLabel}: ${passed ? 'PASSED' : 'FAILED'}\n`;
        }

        if (!passed) {
          allPassed = false;
        }
      } catch (error: any) {
        console.error(`[RunAllTests] Error in ${testLabel}:`, error);
        results[testCase.id] = {
          passed: false,
          error: error.message,
        };
        testOutput += `❌ ${testLabel}: ERROR - ${error.message}\n`;
        allPassed = false;
      }
    }

    testOutput += `\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed. Please fix your solution.'}`;
    setOutput(testOutput);
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

      // All tests passed, submit the solution (combine with main for submission)
      const fullCode = combineCodeWithMain(code, selectedLanguage);
      const response = await ExecutionService.submitSolution(
        problem.id,
        fullCode,
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

        {/* Action Buttons */}
        <View style={tw.mb(8)}>
          <TouchableOpacity
            style={cn(
              tw['bg-dark-900'],
              tw['rounded-2xl'],
              tw.p(5),
              tw.border,
              tw['border-dark-800'],
              tw.mb(4)
            )}
            onPress={() => setShowEditor(true)}
          >
            <Text style={cn(tw['text-primary-500'], tw['text-base'], tw['font-bold'], tw['text-center'])}>
              Open Code Editor
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={cn(
              tw['rounded-xl'],
              tw.px(6),
              tw.py(4),
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
        mainExecutionCode={getMainExecutionCode(selectedLanguage)}
        onClose={() => setShowEditor(false)}
        onCodeChange={setCode}
        onLanguageChange={(lang) => {
          setSelectedLanguage(lang);
          setCode(getCodeTemplate(lang));
        }}
        onRun={runCode}
        onRunTests={runAllTests}
        onSubmit={submitSolution}
        onToggleOutput={() => setShowOutput(!showOutput)}
      />
    </View>
  );
}