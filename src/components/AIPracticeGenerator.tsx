import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { tw, cn } from '../styles/tailwind';

interface AIPracticeGeneratorProps {
  concept: string;
  onGenerate: (difficulty: 'Easy' | 'Medium' | 'Hard') => Promise<void>;
}

export default function AIPracticeGenerator({ concept, onGenerate }: AIPracticeGeneratorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [loading, setLoading] = useState(false);

  const difficulties: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await onGenerate(selectedDifficulty);
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message || 'Failed to generate practice problem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={cn(tw['bg-gradient-to-br'], tw['from-primary-500/20'], tw['to-purple-500/20'], tw['rounded-2xl'], tw.p(6), tw.mb(6), tw.border, tw['border-primary-500/30'])}>
      {/* Header */}
      <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(4))}>
        <Text style={cn(tw['text-primary-400'], tw['text-lg'], tw.mr(2))}>🤖</Text>
        <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'])}>
          AI Practice Generator
        </Text>
      </View>

      <Text style={cn(tw['text-gray-300'], tw['text-sm'], tw.mb(4))}>
        Generate a brand-new practice problem for <Text style={tw['text-primary-400']}>{concept}</Text>
      </Text>

      {/* Difficulty Selector */}
      <View style={tw.mb(4)}>
        <Text style={cn(tw['text-gray-400'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
          SELECT DIFFICULTY
        </Text>
        <View style={cn(tw['flex-row'], tw['justify-between'])}>
          {difficulties.map((diff) => (
            <TouchableOpacity
              key={diff}
              style={cn(
                tw['flex-1'],
                tw['rounded-xl'],
                tw.py(3),
                tw.mr(2),
                tw.border,
                selectedDifficulty === diff
                  ? [tw['bg-primary-500'], tw['border-primary-500']]
                  : [tw['bg-dark-950'], tw['border-dark-800']]
              )}
              onPress={() => setSelectedDifficulty(diff)}
              activeOpacity={0.7}
            >
              <Text
                style={cn(
                  tw['text-center'],
                  tw['text-sm'],
                  tw['font-semibold'],
                  selectedDifficulty === diff ? tw['text-white'] : tw['text-gray-400']
                )}
              >
                {diff}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={cn(
          tw['bg-primary-500'],
          tw['rounded-xl'],
          tw.py(4),
          tw['items-center'],
          tw['justify-center'],
          loading && tw['opacity-70']
        )}
        onPress={handleGenerate}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'])}>
            ✨ Generate Practice Problem
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

