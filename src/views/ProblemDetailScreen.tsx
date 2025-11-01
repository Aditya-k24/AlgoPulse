import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Problem, Language } from '../types';
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

export default function ProblemDetailScreen({ route, navigation }: Props) {
  const { problem } = route.params;
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const languages: Language[] = ['python', 'java', 'cpp'];

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
    try {
      const result = await ExecutionService.runCode(code, selectedLanguage);
      setOutput(result.output);
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitSolution = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please write some code first');
      return;
    }

    setLoading(true);
    try {
      const result = await ExecutionService.submitSolution(
        problem.id,
        code,
        selectedLanguage,
        problem.sample_input,
        problem.sample_output
      );

      if (result.verdict === 'pass') {
        // Schedule recall
        await RecallService.scheduleRecall(problem.id, user?.plan || 'baseline');
        
        Alert.alert(
          'Success!',
          'Your solution is correct! A recall has been scheduled.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Try Again', result.message);
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
      <ScrollView style={cn(tw.flex, tw.px(5))}>
        {/* Problem Header */}
        <View style={tw.py(4)}>
          <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-start'], tw.mb(2))}>
            <Text style={cn(tw['text-white'], tw['text-2xl'], tw['font-bold'], tw.flex, tw.mr(2))}>
              {problem.title}
            </Text>
            <View 
              style={cn(
                tw['rounded-lg'],
                tw.px(3),
                tw.py(1),
                { backgroundColor: getDifficultyColor(problem.difficulty) }
              )}
            >
              <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'])}>
                {problem.difficulty}
              </Text>
            </View>
          </View>
          <Text style={cn(tw['text-primary-500'], tw['text-base'], tw['font-medium'], tw.mb(4))}>
            {problem.category}
          </Text>
        </View>

        {/* Problem Description */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
            Description
          </Text>
          <Text style={cn(tw['text-dark-400'], tw['text-base'], tw['leading-relaxed'])}>
            {problem.description}
          </Text>
        </View>

        {/* Sample Input/Output */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
            Sample Input
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-dark-300'], tw['text-sm'], { fontFamily: 'monospace' })}>
              {problem.sample_input}
            </Text>
          </View>

          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3), tw.mt(4))}>
            Sample Output
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-dark-300'], tw['text-sm'], { fontFamily: 'monospace' })}>
              {problem.sample_output}
            </Text>
          </View>
        </View>

        {/* Constraints */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
            Constraints
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
              {problem.constraints}
            </Text>
          </View>
        </View>

        {/* Methods */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
            Suggested Methods
          </Text>
          <View style={cn(tw['flex-row'], tw['flex-wrap'])}>
            {problem.methods.map((method, index) => (
              <View key={index} style={cn(tw['bg-primary-500/20'], tw['rounded-lg'], tw.px(3), tw.py(1), tw.mr(2), tw.mb(2))}>
                <Text style={cn(tw['text-primary-500'], tw['text-sm'], tw['font-medium'])}>
                  {method}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Language Selection */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
            Select Language
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={cn(
                  tw['rounded-lg'],
                  tw.px(4),
                  tw.py(2),
                  tw.mr(3),
                  tw.border,
                  selectedLanguage === lang
                    ? cn(tw['border-primary-500'], tw['bg-primary-500'])
                    : cn(tw['border-dark-600'], tw['bg-dark-800'])
                )}
                onPress={() => {
                  setSelectedLanguage(lang);
                  setCode(getCodeTemplate(lang));
                }}
              >
                <Text style={cn(
                  tw['text-sm'],
                  tw['font-semibold'],
                  selectedLanguage === lang ? tw['text-white'] : tw['text-dark-400']
                )}>
                  {getLanguageDisplayName(lang)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Code Editor Button */}
        <View style={tw.mb(6)}>
          <TouchableOpacity
            style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}
            onPress={() => setShowEditor(true)}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw.mb(2))}>
              Code Editor
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
              Tap to open code editor ({getLanguageDisplayName(selectedLanguage)})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={cn(tw['flex-row'], tw['justify-between'], tw.mb(8))}>
          <TouchableOpacity
            style={cn(
              tw['bg-warning'],
              tw['rounded-lg'],
              tw.px(6),
              tw.py(3),
              tw.flex,
              tw.mr(2)
            )}
            onPress={runCode}
            disabled={loading}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw['text-center'])}>
              {loading ? 'Running...' : 'Run Code'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={cn(
              tw['bg-primary-500'],
              tw['rounded-lg'],
              tw.px(6),
              tw.py(3),
              tw.flex,
              tw.ml(2)
            )}
            onPress={submitSolution}
            disabled={loading}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw['text-center'])}>
              {loading ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Output */}
        {output && (
          <View style={tw.mb(8)}>
            <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
              Output
            </Text>
            <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
              <Text style={cn(tw['text-dark-300'], tw['text-sm'], { fontFamily: 'monospace' })}>
                {output}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Code Editor Modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={cn(tw.flex, tw['bg-dark-950'])}>
          <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'], tw.p(4), tw.border, tw['border-b'], tw['border-dark-700'])}>
            <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-semibold'])}>
              Code Editor - {getLanguageDisplayName(selectedLanguage)}
            </Text>
            <TouchableOpacity
              style={cn(tw['bg-primary-500'], tw['rounded-lg'], tw.px(4), tw.py(2))}
              onPress={() => setShowEditor(false)}
            >
              <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'])}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          
          <WebView
            source={{
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { 
                      margin: 0; 
                      padding: 10px; 
                      background: #1F2937; 
                      color: #FFFFFF;
                      font-family: 'Monaco', 'Menlo', monospace;
                    }
                    textarea {
                      width: 100%;
                      height: 100vh;
                      background: #111827;
                      color: #FFFFFF;
                      border: none;
                      padding: 10px;
                      font-family: 'Monaco', 'Menlo', monospace;
                      font-size: 14px;
                      resize: none;
                      outline: none;
                    }
                  </style>
                </head>
                <body>
                  <textarea id="editor" placeholder="Write your code here...">${code}</textarea>
                  <script>
                    const editor = document.getElementById('editor');
                    editor.addEventListener('input', () => {
                      window.ReactNativeWebView.postMessage(editor.value);
                    });
                  </script>
                </body>
                </html>
              `
            }}
            style={{ flex: 1 }}
            onMessage={(event) => {
              setCode(event.nativeEvent.data);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}