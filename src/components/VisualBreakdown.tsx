import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { tw, cn } from '../styles/tailwind';
import MarkdownText from './MarkdownText';

interface VisualBreakdownProps {
  content: string; // ASCII diagrams or mental model text
  title?: string;
}

export default function VisualBreakdown({ content, title = 'Visual / Mental Model' }: VisualBreakdownProps) {
  return (
    <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(6), tw.mb(6), tw.border, tw['border-dark-800'])}>
      {/* Header */}
      <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(4))}>
        <Text style={cn(tw['text-primary-400'], tw['text-lg'], tw.mr(2))}>🎨</Text>
        <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'])}>
          {title}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={cn(tw['bg-dark-950'], tw['rounded-xl'], tw.p(4))}
      >
        <MarkdownText 
          textStyle={{ 
            fontSize: 12, 
            lineHeight: 18,
            fontFamily: 'monospace',
            color: '#d1d5db'
          }}
        >
          {content}
        </MarkdownText>
      </ScrollView>
    </View>
  );
}

