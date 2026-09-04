import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { tw, cn } from '../styles/tailwind';
import MarkdownText from './MarkdownText';

export interface Approach {
  name: string;
  type: 'brute-force' | 'intermediate' | 'optimal';
  whenToUse: string;
  coreIntuition: string;
  steps: string[];
  timeComplexity: string;
  spaceComplexity: string;
  pitfalls?: string;
}

interface ApproachExplanationProps {
  approach: Approach;
  index: number;
}

export default function ApproachExplanation({ approach, index }: ApproachExplanationProps) {
  const [expanded, setExpanded] = useState(approach.type === 'optimal'); // Expand optimal by default

  const getBadgeColor = () => {
    switch (approach.type) {
      case 'optimal':
        return { bg: tw['bg-green-500/20'], text: tw['text-green-400'], border: tw['border-green-500/30'] };
      case 'intermediate':
        return { bg: tw['bg-yellow-500/20'], text: tw['text-yellow-400'], border: tw['border-yellow-500/30'] };
      default:
        return { bg: tw['bg-gray-500/20'], text: tw['text-gray-400'], border: tw['border-gray-500/30'] };
    }
  };

  const colors = getBadgeColor();

  return (
    <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.mb(4), tw.border, tw['border-dark-800'])}>
      {/* Header - Always visible */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={cn(tw.p(5), tw['flex-row'], tw['items-center'], tw['justify-between'])}
        activeOpacity={0.7}
      >
        <View style={tw.flex}>
          <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(2))}>
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'])}>
              Approach {index + 1}: {approach.name}
            </Text>
          </View>
          <View style={cn(tw['flex-row'], tw['items-center'], tw['flex-wrap'])}>
            <View style={cn(colors.bg, colors.border, tw.border, tw['rounded-full'], tw.px(3), tw.py(1), tw.mr(2), tw.mb(2))}>
              <Text style={cn(colors.text, tw['text-xs'], tw['font-semibold'])}>
                {approach.type === 'optimal' ? '⭐ Recommended' : approach.type.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={cn(tw['bg-purple-500/20'], tw['rounded-full'], tw.px(3), tw.py(1), tw.mr(2), tw.mb(2))}>
              <Text style={cn(tw['text-purple-400'], tw['text-xs'])}>
                ⏱️ {approach.timeComplexity}
              </Text>
            </View>
            <View style={cn(tw['bg-blue-500/20'], tw['rounded-full'], tw.px(3), tw.py(1), tw.mb(2))}>
              <Text style={cn(tw['text-blue-400'], tw['text-xs'])}>
                💾 {approach.spaceComplexity}
              </Text>
            </View>
          </View>
        </View>
        <Text style={cn(tw['text-gray-400'], tw['text-xl'])}>
          {expanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {/* Expandable Content */}
      {expanded && (
        <View style={cn(tw.px(5), tw.pb(5))}>
          {/* When to Use */}
          <View style={tw.mb(4)}>
            <Text style={cn(tw['text-gray-400'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
              WHEN TO USE
            </Text>
            <MarkdownText 
              textStyle={{ fontSize: 14, lineHeight: 20 }}
            >
              {approach.whenToUse}
            </MarkdownText>
          </View>

          {/* Core Intuition */}
          <View style={tw.mb(4)}>
            <Text style={cn(tw['text-gray-400'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
              CORE INTUITION
            </Text>
            <MarkdownText 
              textStyle={{ fontSize: 14, lineHeight: 20 }}
            >
              {approach.coreIntuition}
            </MarkdownText>
          </View>

          {/* Step-by-Step */}
          <View style={tw.mb(4)}>
            <Text style={cn(tw['text-gray-400'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
              STEP-BY-STEP IDEA
            </Text>
            {approach.steps.map((step, idx) => (
              <View key={idx} style={cn(tw['flex-row'], tw.mb(2))}>
                <View style={cn(tw['bg-primary-500/20'], tw['rounded-full'], tw['w-6'], tw['h-6'], tw['items-center'], tw['justify-center'], tw.mr(3))}>
                  <Text style={cn(tw['text-primary-400'], tw['text-xs'], tw['font-bold'])}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={tw.flex}>
                  <MarkdownText 
                    textStyle={{ fontSize: 14, lineHeight: 20 }}
                  >
                    {step}
                  </MarkdownText>
                </View>
              </View>
            ))}
          </View>

          {/* Pitfalls */}
          {approach.pitfalls && (
            <View style={cn(tw['bg-red-500/10'], tw['rounded-xl'], tw.p(4), tw.border, tw['border-red-500/20'])}>
              <Text style={cn(tw['text-red-400'], tw['text-xs'], tw['font-semibold'], tw.mb(2))}>
                ⚠️ PITFALLS
              </Text>
              <MarkdownText 
                textStyle={{ fontSize: 14, lineHeight: 20 }}
              >
                {approach.pitfalls}
              </MarkdownText>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

