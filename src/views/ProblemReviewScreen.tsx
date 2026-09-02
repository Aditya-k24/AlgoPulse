import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Problem } from '../models/Problem';
import { useAuth } from '../contexts/AuthContext';
import { tw, cn } from '../styles/tailwind';
import { RecallService } from '../services/recallService';
import { ReviewContentService } from '../services/reviewContentService';
import QuickRefresh from '../components/QuickRefresh';
import ApproachExplanation, { Approach } from '../components/ApproachExplanation';
import VisualBreakdown from '../components/VisualBreakdown';
import References, { Reference } from '../components/References';
import LoadingSpinner from '../components/LoadingSpinner';
import MarkdownText from '../components/MarkdownText';

interface Props {
  route: {
    params: {
      problem: Problem;
    };
  };
  navigation: any;
}

export default function ProblemReviewScreen({ route, navigation }: Props) {
  const { problem } = route.params;
  const { user } = useAuth();
  const [reviewCount, setReviewCount] = useState(0);
  const [lastReviewed, setLastReviewed] = useState<Date | null>(null);

  useEffect(() => {
    loadReviewStatus();
  }, [problem.id]);

  const loadReviewStatus = async () => {
    if (!user) return;
    
    try {
      const status = await RecallService.getScheduleForProblem(user.id, problem.id);
      if (status) {
        setReviewCount(status.review_count || 0);
        setLastReviewed(status.last_reviewed_at ? new Date(status.last_reviewed_at) : null);
      }
    } catch (error) {
      console.error('Error loading review status:', error);
    }
  };

  const markAsReviewed = async () => {
    if (!user) {
      Alert.alert('Not Logged In', 'Please log in to track your progress');
      return;
    }

    try {
      await RecallService.markAsReviewed(user.id, problem.id);
      setReviewCount(prev => prev + 1);
      setLastReviewed(new Date());
      Alert.alert(
        '✅ Reviewed!',
        `This problem has been marked as reviewed. Next review scheduled based on your plan.`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark as reviewed');
    }
  };

  // State for review content
  const [quickRefreshBullets, setQuickRefreshBullets] = useState<string[]>([]);
  const [patternName, setPatternName] = useState<string>('');
  const [approaches, setApproaches] = useState<Approach[]>([]);
  const [visualBreakdown, setVisualBreakdown] = useState<string>('');
  const [references, setReferences] = useState<Reference[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    loadReviewContent();
  }, [problem.id]);

  const loadReviewContent = async () => {
    setContentLoading(true);
    try {
      const content = await ReviewContentService.getReviewContent(problem.id);
      
      if (content) {
        setQuickRefreshBullets(content.quickRefresh);
        setPatternName(content.patternName || '');
        setApproaches(content.approaches);
        setVisualBreakdown(content.visualBreakdown || '');
        setReferences(content.references);
      } else {
        // Use fallback/mock data if no content in database
        setQuickRefreshBullets([
          `Pattern: ${problem.methods?.[0] || 'General'} approach`,
          'Key idea: Apply the pattern to solve efficiently',
          'When to use: Based on problem constraints',
          'Edge cases: Consider empty inputs and boundary conditions',
          'Time complexity depends on chosen approach'
        ]);
        setPatternName(problem.methods?.[0] || 'General Approach');
        setApproaches([
          {
            name: 'Approach 1',
            type: 'optimal',
            whenToUse: 'For most cases',
            coreIntuition: 'Apply core algorithm concept',
            steps: ['Step 1: Analyze input', 'Step 2: Apply pattern', 'Step 3: Return result'],
            timeComplexity: 'O(n)',
            spaceComplexity: 'O(1)',
          }
        ]);
        setVisualBreakdown('Visual diagram not yet available');
        setReferences([]);
      }
    } catch (error) {
      console.error('Error loading review content:', error);
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <View style={cn(tw.flex, tw['bg-dark-950'])}>
      {/* Header */}
      <View style={cn(tw['bg-dark-900'], tw['border-b'], tw['border-dark-800'], tw.px(6), tw.pt(16), tw.pb(6))}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw.mb(4)}
        >
          <Text style={cn(tw['text-primary-400'], tw['text-base'])}>← Back</Text>
        </TouchableOpacity>
        
        <View style={cn(tw['flex-row'], tw['items-start'], tw['justify-between'])}>
          <View style={tw.flex}>
            <Text style={cn(tw['text-white'], tw['text-2xl'], tw['font-bold'], tw.mb(2))}>
              {problem.title}
            </Text>
            <View style={cn(tw['flex-row'], tw['items-center'], tw['flex-wrap'])}>
              <View style={cn(
                tw['rounded-full'],
                tw.px(3),
                tw.py(1),
                tw.mr(2),
                tw.mb(2),
                problem.difficulty === 'Easy' ? tw['bg-green-500/20'] :
                problem.difficulty === 'Medium' ? tw['bg-yellow-500/20'] :
                tw['bg-red-500/20']
              )}>
                <Text style={cn(
                  tw['text-xs'],
                  tw['font-semibold'],
                  problem.difficulty === 'Easy' ? tw['text-green-400'] :
                  problem.difficulty === 'Medium' ? tw['text-yellow-400'] :
                  tw['text-red-400']
                )}>
                  {problem.difficulty}
                </Text>
              </View>
              <View style={cn(tw['bg-blue-500/20'], tw['rounded-full'], tw.px(3), tw.py(1), tw.mb(2))}>
                <Text style={cn(tw['text-blue-400'], tw['text-xs'])}>
                  {problem.category}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Review Stats */}
        {reviewCount > 0 && (
          <View style={cn(tw.mt(4), tw.pt(4), tw['border-t'], tw['border-dark-800'])}>
            <Text style={cn(tw['text-gray-400'], tw['text-xs'])}>
              📊 Reviewed {reviewCount} time{reviewCount !== 1 ? 's' : ''}
              {lastReviewed && ` • Last: ${lastReviewed.toLocaleDateString()}`}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={tw.flex} contentContainerStyle={cn(tw.px(6), tw.py(6))}>
        {contentLoading ? (
          <LoadingSpinner message="Loading review content..." />
        ) : (
          <>
        {/* Problem Description - FIRST */}
        <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(6), tw.mb(6), tw.border, tw['border-dark-800'])}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
            Problem Statement
          </Text>
          <MarkdownText 
            style={tw.mb(4)}
            textStyle={{ fontSize: 16, lineHeight: 28 }}
          >
            {problem.description}
          </MarkdownText>

          {/* Example Input/Output */}
          {(problem.sample_input || problem.sample_output) && (
            <View style={cn(tw.mt(4), tw.pt(4), tw['border-t'], tw['border-dark-800'])}>
              <Text style={cn(tw['text-gray-400'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
                EXAMPLE
              </Text>
              {problem.sample_input && (
                <View style={tw.mb(3)}>
                  <Text style={cn(tw['text-gray-500'], tw['text-xs'], tw.mb(1))}>Input:</Text>
                  <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(3))}>
                    <Text style={cn(tw['text-gray-200'], tw['text-sm'], tw['font-mono'])}>
                      {problem.sample_input}
                    </Text>
                  </View>
                </View>
              )}
              {problem.sample_output && (
                <View>
                  <Text style={cn(tw['text-gray-500'], tw['text-xs'], tw.mb(1))}>Output:</Text>
                  <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(3))}>
                    <Text style={cn(tw['text-gray-200'], tw['text-sm'], tw['font-mono'])}>
                      {problem.sample_output}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {problem.constraints && (
            <View style={cn(tw.mt(4), tw.pt(4), tw['border-t'], tw['border-dark-800'])}>
              <Text style={cn(tw['text-gray-400'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
                CONSTRAINTS
              </Text>
              <MarkdownText 
                textStyle={{ fontSize: 14, lineHeight: 20 }}
              >
                {problem.constraints}
              </MarkdownText>
            </View>
          )}
        </View>

        {/* Quick Refresh */}
        {quickRefreshBullets.length > 0 && (
          <QuickRefresh
            bullets={quickRefreshBullets}
            patternName={patternName}
          />
        )}

        {/* Multi-Concept Explanations */}
        {approaches.length > 0 && (
          <View style={tw.mb(6)}>
            <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
              💡 Solution Approaches
            </Text>
            {approaches.map((approach, index) => (
              <ApproachExplanation
                key={index}
                approach={approach}
                index={index}
              />
            ))}
          </View>
        )}

        {/* Visual Breakdown */}
        {visualBreakdown && <VisualBreakdown content={visualBreakdown} />}

        {/* References */}
        <References references={references} />

        {/* Solution Code */}
        {problem.solutions?.python && (
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(6), tw.mb(6), tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
              💻 Python Solution
            </Text>
            <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4))}>
              <Text style={cn(tw['text-gray-200'], tw['text-sm'], tw['font-mono'], tw.leading(6))}>
                {problem.solutions.python}
              </Text>
            </View>
          </View>
        )}

        {/* Mark as Reviewed Button */}
        <TouchableOpacity
          style={cn(
            tw['bg-primary-500'],
            tw['rounded-2xl'],
            tw.py(5),
            tw['items-center'],
            tw.mb(6)
          )}
          onPress={markAsReviewed}
          activeOpacity={0.8}
        >
          <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'])}>
          ✅ Mark as Reviewed
        </Text>
      </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

