import React from 'react';
import { View, Text } from 'react-native';
import { tw, cn } from '../styles/tailwind';
import MarkdownText from './MarkdownText';

interface QuickRefreshProps {
  bullets: string[];
  patternName?: string;
}

export default function QuickRefresh({ bullets, patternName }: QuickRefreshProps) {
  return (
    <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(6), tw.mb(6), tw.border, tw['border-primary-500/20'])}>
      {/* Header */}
      <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(4))}>
        <View style={cn(tw['bg-primary-500/20'], tw['rounded-full'], tw.p(2), tw.mr(3))}>
          <Text style={cn(tw['text-primary-400'], tw['text-lg'])}>⚡</Text>
        </View>
        <View style={tw.flex}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'])}>
            Quick Refresh
          </Text>
          {patternName && (
            <Text style={cn(tw['text-primary-400'], tw['text-xs'], tw.mt(1))}>
              Pattern: {patternName}
            </Text>
          )}
        </View>
      </View>

      {/* Bullets */}
      <View style={tw.mt(2)}>
        {bullets.map((bullet, index) => (
          <View key={index} style={cn(tw['flex-row'], tw.mb(3))}>
            <Text style={cn(tw['text-primary-400'], tw.mr(3), tw['text-base'])}>•</Text>
            <View style={tw.flex}>
              <MarkdownText 
                textStyle={{ fontSize: 14, lineHeight: 20 }}
              >
                {bullet}
              </MarkdownText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

