import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Language, TestCase } from '../models/Problem';
import { tw, cn } from '../styles/tailwind';

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
  mainExecutionCode?: string;
  onClose: () => void;
  onCodeChange: (code: string) => void;
  onLanguageChange?: (language: Language) => void;
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

const getEditorHtml = (code: string, language: string): string => {
  const langClass = (language || 'python').toLowerCase();
  
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
          color: #E5E7EB;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          overflow: hidden;
        }
        textarea {
          width: 100%;
          height: 100%;
          background: #111827;
          color: #E5E7EB;
          border: none;
          padding: 16px;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 16px;
          line-height: 1.6;
          resize: none;
          outline: none;
          -webkit-appearance: none;
          -webkit-tap-highlight-color: transparent;
          tab-size: 2;
          -moz-tab-size: 2;
          white-space: pre;
          overflow-wrap: normal;
          overflow-x: auto;
        }
        textarea::placeholder {
          color: #6B7280;
        }
        textarea::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        textarea::-webkit-scrollbar-track {
          background: #1F2937;
        }
        textarea::-webkit-scrollbar-thumb {
          background: #4B5563;
          border-radius: 4px;
        }
        textarea::-webkit-scrollbar-thumb:hover {
          background: #6B7280;
        }
      </style>
    </head>
    <body>
      <textarea id="editor" placeholder="Write your code here...\\n\\nTip: Use Tab for indentation" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">${escapeHtml(code)}</textarea>
      <script>
        const editor = document.getElementById('editor');
        
        // Handle input changes
        editor.addEventListener('input', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'code',
            value: editor.value
          }));
        });
        
        // Handle Tab key for indentation
        editor.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const value = editor.value;
            
            if (e.shiftKey) {
              // Shift+Tab: Remove indentation
              const before = value.substring(0, start);
              const after = value.substring(end);
              const lineStart = before.lastIndexOf('\\n') + 1;
              const line = value.substring(lineStart, start);
              
              if (line.startsWith('  ')) {
                editor.value = value.substring(0, lineStart) + line.substring(2) + value.substring(start);
                editor.selectionStart = editor.selectionEnd = start - 2;
              }
            } else {
              // Tab: Add indentation
              editor.value = value.substring(0, start) + '  ' + value.substring(start);
              editor.selectionStart = editor.selectionEnd = start + 2;
            }
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'code',
              value: editor.value
            }));
          }
        });
        
        // Auto-focus on load
        editor.focus();
        
        // Scroll to cursor position
        setTimeout(() => {
          editor.setSelectionRange(editor.value.length, editor.value.length);
        }, 100);
      </script>
    </body>
    </html>
  `;
};

export default function CodeEditor({
  visible,
  code,
  language = 'python',
  testCases,
  testResults,
  output,
  showOutput,
  loading,
  runningTests,
  mainExecutionCode = '',
  onClose,
  onCodeChange,
  onLanguageChange,
  onRun,
  onRunTests,
  onSubmit,
  onToggleOutput,
}: CodeEditorProps) {
  const visibleTestCases = testCases.filter(tc => tc.isVisible);
  const safeLanguage = language || 'python';
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showMainCode, setShowMainCode] = useState(false);
  const languages: Language[] = ['python']; // TODO: Add 'java', 'cpp' later

  // Close dropdown when editor closes
  React.useEffect(() => {
    if (!visible) {
      setShowLanguageDropdown(false);
      setShowMainCode(false);
    }
  }, [visible]);

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
            <View style={cn(tw.flex, tw['flex-row'], tw['items-center'])}>
              <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-semibold'], tw.mr(3))}>
                Code Editor
              </Text>
              <View style={{ position: 'relative', zIndex: 1000 }}>
                <TouchableOpacity
                  style={cn(
                    tw['bg-dark-800'],
                    tw['rounded-lg'],
                    tw.px(3),
                    tw.py(2),
                    tw.border,
                    tw['border-dark-700'],
                    tw['flex-row'],
                    tw['items-center']
                  )}
                  onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  activeOpacity={0.7}
                >
                  <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'], tw.mr(2))}>
                    {getLanguageDisplayName(safeLanguage)}
                  </Text>
                  <Text style={cn(
                    tw['text-dark-400'],
                    tw['text-xs'],
                    showLanguageDropdown && { transform: [{ rotate: '180deg' }] }
                  )}>
                    ▼
                  </Text>
                </TouchableOpacity>
                
                {showLanguageDropdown && (
                  <View style={{
                    position: 'absolute',
                    top: 40,
                    left: 0,
                    backgroundColor: '#1F2937',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#374151',
                    minWidth: 120,
                    zIndex: 1001,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                  }}>
                    {languages.map((lang, idx) => (
                      <TouchableOpacity
                        key={lang}
                        style={cn(
                          tw.px(4),
                          tw.py(3),
                          safeLanguage === lang && tw['bg-dark-900'],
                          idx < languages.length - 1 && tw.border && tw['border-b'] && tw['border-dark-700']
                        )}
                        onPress={() => {
                          if (onLanguageChange) {
                            onLanguageChange(lang);
                          }
                          setShowLanguageDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={cn(
                          tw['text-sm'],
                          tw['font-semibold'],
                          safeLanguage === lang ? tw['text-primary-500'] : tw['text-white']
                        )}>
                          {getLanguageDisplayName(lang)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
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
                {runningTests ? 'Testing...' : 'Test All'}
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
            key={`editor-${safeLanguage}`}
            source={{ html: getEditorHtml(code, safeLanguage) }}
            style={{ flex: 1 }}
            onMessage={(event) => {
              try {
                const message = JSON.parse(event.nativeEvent.data);
                if (message.type === 'code') {
                  onCodeChange(message.value);
                }
              } catch {
                // Fallback for plain string messages
                onCodeChange(event.nativeEvent.data);
              }
            }}
            scalesPageToFit={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);
            }}
          />
        </View>

        {/* Test Cases Panel - Compact */}
        {testCases.length > 0 && (
          <View style={cn(tw['bg-dark-900'], tw.border, tw['border-t'], tw['border-dark-700'])}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cn(tw.px(4), tw.py(2))}>
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
                        tw.px(3),
                        tw.py(2),
                        tw.mr(2),
                        tw.border,
                        tw['border-dark-700'],
                        { minWidth: 80 }
                      )}
                    >
                      <View style={cn(tw['flex-row'], tw['items-center'])}>
                        <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-bold'], tw.mr(2))}>
                          {index + 1}
                        </Text>
                        {hasResult && (
                          <View style={cn(
                            tw['rounded-full'],
                            tw.px(1.5),
                            tw.py(0.5),
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
                    </View>
                  );
                })}
                <View style={cn(
                  tw['bg-dark-800'],
                  tw['rounded-lg'],
                  tw.px(3),
                  tw.py(2),
                  tw.border,
                  tw['border-dark-600'],
                  { minWidth: 80, borderStyle: 'dashed' }
                )}>
                  <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['font-semibold'])}>
                    +2
                  </Text>
                </View>
              </View>
            </ScrollView>
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

        {/* Main Execution Code Dropdown */}
        {mainExecutionCode && (
          <View style={cn(tw['bg-dark-900'], tw.border, tw['border-t'], tw['border-dark-700'])}>
            <TouchableOpacity
              onPress={() => setShowMainCode(!showMainCode)}
              style={cn(tw.px(4), tw.py(2), tw['flex-row'], tw['justify-between'], tw['items-center'])}
              activeOpacity={0.7}
            >
              <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'])}>
                Main Execution Code (Auto-generated)
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-xs'])}>
                {showMainCode ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {showMainCode && (
              <View style={cn(tw.px(4), tw.pb(3), tw.border, tw['border-t'], tw['border-dark-700'])}>
                <ScrollView 
                  style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(3), { maxHeight: 150 })}
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={cn(tw['text-dark-400'], tw['text-xs'], { fontFamily: 'monospace', opacity: 0.8 })}>
                    {mainExecutionCode}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
