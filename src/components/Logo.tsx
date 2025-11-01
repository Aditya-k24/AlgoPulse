import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleProp, ViewStyle, Animated, Text } from 'react-native';

interface LogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  isDarkTheme?: boolean;
  animated?: boolean;
  showCircle?: boolean;
}

export default function Logo({ size = 60, style, isDarkTheme = true, animated = false, showCircle = true }: LogoProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (animated) {
      // Subtle pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }
  }, [animated]);

  // Try to load the logo, fallback to emoji if it fails
  let logoSource;
  try {
    logoSource = isDarkTheme 
      ? require('../../assets/images/logo-white.png')
      : require('../../assets/images/logo-black.png');
  } catch (error) {
    console.log('Logo file not found, using fallback');
    logoSource = null;
  }

  const Container = animated ? Animated.View : View;

  if (!showCircle) {
    // Just show the logo without any background circle
    return (
      <Container
        style={[
          {
            justifyContent: 'center',
            alignItems: 'center',
          },
          animated && {
            transform: [{ scale: pulseAnim }],
          },
          style,
        ]}
      >
        {logoSource && !imageError ? (
          <Image
            source={logoSource}
            style={{
              width: size,
              height: size,
              resizeMode: 'contain',
            }}
            onError={() => {
              console.log('Image failed to load');
              setImageError(true);
            }}
          />
        ) : (
          <Text style={{ fontSize: size * 0.6, color: isDarkTheme ? '#FFFFFF' : '#000000' }}>
            🧠
          </Text>
        )}
      </Container>
    );
  }

  // Original circle version
  return (
    <Container
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDarkTheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        },
              animated && {
                transform: [{ scale: pulseAnim }],
              },
        style,
      ]}
    >
      {logoSource && !imageError ? (
        <Image
          source={logoSource}
          style={{
            width: size * 0.7,
            height: size * 0.7,
            resizeMode: 'contain',
          }}
          onError={() => {
            console.log('Image failed to load');
            setImageError(true);
          }}
        />
      ) : (
        <Text style={{ fontSize: size * 0.4, color: isDarkTheme ? '#FFFFFF' : '#000000' }}>
          🧠
        </Text>
      )}
    </Container>
  );
}
