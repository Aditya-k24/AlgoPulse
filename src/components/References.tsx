import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { tw, cn } from '../styles/tailwind';

export interface Reference {
  type: 'video' | 'article';
  title: string;
  url: string;
  author?: string;
}

interface ReferencesProps {
  references: Reference[];
}

export default function References({ references }: ReferencesProps) {
  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(6), tw.mb(6), tw.border, tw['border-dark-800'])}>
      {/* Header */}
      <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(4))}>
        <Text style={cn(tw['text-primary-400'], tw['text-lg'], tw.mr(2))}>📚</Text>
        <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'])}>
          References
        </Text>
      </View>

      {/* Links */}
      <View>
        {references.length === 0 ? (
          <View style={cn(tw['bg-dark-950'], tw['rounded-xl'], tw.p(4), tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-gray-400'], tw['text-sm'], tw['text-center'])}>
              📚 No references available yet. References will appear here once the problem content is generated.
            </Text>
          </View>
        ) : (
          references.map((ref, index) => (
          <TouchableOpacity
            key={index}
            style={cn(
              tw['bg-dark-950'],
              tw['rounded-xl'],
              tw.p(4),
              tw.mb(3),
              tw.border,
              tw['border-dark-800']
            )}
            onPress={() => openLink(ref.url)}
            activeOpacity={0.7}
          >
            <View style={cn(tw['flex-row'], tw['items-center'], tw.mb(2))}>
              <View style={cn(
                ref.type === 'video' ? tw['bg-red-500/20'] : tw['bg-blue-500/20'],
                tw['rounded-full'],
                tw.px(3),
                tw.py(1),
                tw.mr(2)
              )}>
                <Text style={cn(
                  ref.type === 'video' ? tw['text-red-400'] : tw['text-blue-400'],
                  tw['text-xs'],
                  tw['font-semibold']
                )}>
                  {ref.type === 'video' ? '▶️ Video' : '📄 Article'}
                </Text>
              </View>
            </View>
            <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-medium'], tw.mb(1))}>
              {ref.title}
            </Text>
            {ref.author && (
              <Text style={cn(tw['text-gray-400'], tw['text-xs'])}>
                by {ref.author}
              </Text>
            )}
          </TouchableOpacity>
        ))
        )}
      </View>
    </View>
  );
}

