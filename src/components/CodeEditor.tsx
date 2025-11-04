import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Language } from '../models/Problem';
import { tw, cn } from '../styles/tailwind';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isVisible: boolean;
  passed?: boolean;
  actualOutput?: string;
  error?: string;
}

interface TestResult {
  passed: boolean;
  output?: string;
  error?: string;
}

interface CodeEditorProps {
  visible: boolean;
  code: string;
  language: Language;
  testCases: TestCase[];
  testResults: Record<string, TestResult>;
  output: string;
  showOutput: boolean;
  loading: boolean;
  runningTests: boolean;
  onClose: () => void;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onRunTests: () => void;
  onSubmit: () => void;
  onToggleOutput: () => void;
}

const getLanguageDisplayName = (lang: Language) => {
  switch (lang) {
    case 'python': return 'Python';
    case 'java': return 'Java';
    case 'cpp': return 'C++';
    default: return lang;
  }
};

const escapeHtml = (text: string): string => {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getEditorHtml = (code: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          background: #111827;
          color: #FFFFFF;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          overflow: hidden;
        }
        textarea {
          width: 100%;
          height: 100%;
          background: #111827;
          color: #FFFFFF;
          border: none;
          padding: 16px;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.5;
          resize: none;
          outline: none;
          -webkit-appearance: none;
          -webkit-tap-highlight-color: transparent;
        }
        textarea::placeholder {
          color: #6B7280;
        }
      </style>
    </head>
    <body>
      <textarea id="editor" placeholder="Write your code here..." spellcheck="false">${escapeHtml(code)}</textarea>
      <script>
        const editor = document.getElementById('editor');
        editor.addEventListener('input', () => {
          window.ReactNativeWebView.postMessage(editor.value);
        });
        editor.focus();
      </script>
    </body>
    </html>
  `;
};

export default function CodeEditor({
  visible,
  code,
  language,
  testCases,
  testResults,
  output,
  showOutput,
  loading,
  runningTests,
  onClose,
  onCodeChange,
  onRun,
  onRunTests,
  onSubmit,
  onToggleOutput,
}: CodeEditorProps) {
  const visibleTestCases = testCases.filter(tc => tc.isVisible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={cn(tw.flex, tw['bg-dark-950'])}>
        {/* Header */}
        <View style={cn(tw.px(4), tw.py(3), tw.border, tw['border-b'], tw['border-dark-700'])}>
          <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'], tw.mb(3))}>
            <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-semibold'])}>
              Code Editor - {getLanguageDisplayName(language)}
            </Text>
            <TouchableOpacity
              style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.px(4), tw.py(2))}
              onPress={onClose}
            >
              <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'])}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Action Buttons */}
          <View style={cn(tw['flex-row'], tw.mt(2))}>
            <TouchableOpacity
              style={cn(
                tw.flex,
                tw['bg-dark-800'],
                tw['rounded-lg'],
                tw.px(4),
                tw.py(2),
                tw.mr(2),
                tw.border,
                tw['border-dark-700']
              )}
              onPress={onRun}
              disabled={loading || runningTests}
              activeOpacity={(loading || runningTests) ? 1 : 0.7}
            >
              <Text style={cn(
                tw['text-white'],
                tw['text-sm'],
                tw['font-semibold'],
                tw['text-center'],
                (loading || runningTests) && { opacity: 0.5 }
              )}>
                {loading ? 'Running...' : '▶ Run'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={cn(
                tw.flex,
                tw['bg-primary-400'],
                tw['rounded-lg'],
                tw.px(4),
                tw.py(2),
                tw.mr(2),
                tw.border,
                tw['border-primary-500']
              )}
              onPress={onRunTests}
              disabled={loading || runningTests}
              activeOpacity={(loading || runningTests) ? 1 : 0.7}
            >
              <Text style={cn(
                tw['text-white'],
                tw['text-sm'],
                tw['font-semibold'],
                tw['text-center'],
                (loading || runningTests) && { opacity: 0.5 }
              )}>
                {runningTests ? 'Testing...' : '🧪 Test All'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={cn(
                tw.flex,
                tw['bg-primary-500'],
                tw['rounded-lg'],
                tw.px(4),
                tw.py(2)
              )}
              onPress={onSubmit}
              disabled={loading || runningTests}
              activeOpacity={(loading || runningTests) ? 1 : 0.7}
            >
              <Text style={cn(
                tw['text-white'],
                tw['text-sm'],
                tw['font-bold'],
                tw['text-center'],
                (loading || runningTests) && { opacity: 0.5 }
              )}>
                {loading ? 'Submitting...' : '✓ Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Code Editor */}
        <View style={{ flex: showOutput ? 0.6 : 1 }}>
          <WebView
            source={{ html: getEditorHtml(code) }}
            style={{ flex: 1 }}
            onMessage={(event) => {
              onCodeChange(event.nativeEvent.data);
            }}
            scalesPageToFit={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Test Cases Panel */}
        {testCases.length > 0 && (
          <View style={cn(tw['bg-dark-900'], tw.border, tw['border-t'], tw['border-dark-700'])}>
            <View style={cn(tw.px(4), tw.py(2), tw.border, tw['border-b'], tw['border-dark-700'])}>
              <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
                TEST CASES
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={cn(tw['flex-row'])}>
                  {visibleTestCases.map((testCase, index) => {
                    const result = testResults[testCase.id];
                    const passed = result?.passed;
                    const hasResult = result !== undefined;
                    
                    return (
                      <View
                        key={testCase.id}
                        style={cn(
                          tw['bg-dark-800'],
                          tw['rounded-lg'],
                          tw.p(3),
                          tw.mr(2),
                          tw.border,
                          tw['border-dark-700'],
                          { minWidth: 120 }
                        )}
                      >
                        <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(2))}>
                          <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-bold'], tw.mr(2))}>
                            {`Test ${index + 1}`}
                          </Text>
                          {hasResult && (
                            <View style={cn(
                              tw['rounded-full'],
                              tw.px(2),
                              tw.py(1),
                              passed ? tw['bg-green-500/20'] : tw['bg-red-500/20']
                            )}>
                              <Text style={cn(
                                tw['text-xs'],
                                tw['font-semibold'],
                                passed ? tw['text-green-400'] : tw['text-red-400']
                              )}>
                                {passed ? '✓' : '✗'}
                              </Text>
                            </View>
                          )}
                        </View>
                        {hasResult && result.error && (
                          <Text style={cn(tw['text-red-400'], tw['text-xs'], tw.mb(1))}>
                            Error: {result.error}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                  <View style={cn(
                    tw['bg-dark-800'],
                    tw['rounded-lg'],
                    tw.p(3),
                    tw.border,
                    tw['border-dark-600'],
                    { minWidth: 120, borderStyle: 'dashed' }
                  )}>
                    <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['font-semibold'])}>
                      +2 Hidden
                    </Text>
                    <Text style={cn(tw['text-dark-500'], tw['text-xs'], tw.mt(1))}>
                      Run tests to see
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Output Panel */}
        {showOutput && (
          <View style={cn(tw['bg-dark-900'], tw.border, tw['border-t'], tw['border-dark-700'], { flex: 0.4 })}>
            <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'], tw.px(4), tw.py(2), tw.border, tw['border-b'], tw['border-dark-700'])}>
              <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'])}>
                OUTPUT
              </Text>
              <TouchableOpacity
                onPress={onToggleOutput}
                style={cn(tw.px(2), tw.py(1))}
              >
                <Text style={cn(tw['text-dark-400'], tw['text-xs'])}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={tw.p(4)}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={true}
            >
              <Text style={cn(tw['text-white'], tw['text-sm'], { fontFamily: 'monospace' })}>
                {output || 'No output yet. Run your code to see results.'}
              </Text>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
