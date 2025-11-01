import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { tw, cn } from '../styles/tailwind';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'large', 
  color = '#3B82F6' 
}: LoadingSpinnerProps) {
  return (
    <View style={cn(tw.flex, tw['justify-center'], tw['items-center'], tw['bg-dark-950'], tw.p(5))}>
      <ActivityIndicator size={size} color={color} />
      <Text style={cn(tw['text-dark-400'], tw['text-base'], tw.mt(4), tw['text-center'])}>{message}</Text>
    </View>
  );
}
