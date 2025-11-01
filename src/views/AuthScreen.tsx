import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { AuthController } from '../controllers/AuthController';
import { tw, cn } from '../styles/tailwind';
import Logo from '../components/Logo';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function AuthScreen() {
  const authController = AuthController.getInstance();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [plan, setPlan] = useState<'baseline' | 'time_crunch'>('baseline');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [toastAnim] = useState(new Animated.Value(0));
  
  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const glowAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation for divider
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (toast) {
      Animated.sequence([
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast(null);
      });
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ id: Date.now(), message, type });
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // For signup, check password confirmation
    if (!isLogin) {
      if (!confirmPassword) {
        showToast('Please confirm your password', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }
      if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await authController.signIn(email, password);
        showToast('Successfully signed in! Welcome back 🎉', 'success');
      } else {
        await authController.signUp(email, password, plan);
        showToast('Account created successfully! Welcome to AlgoPulse 🚀', 'success');
        // Reset form after successful signup
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      showToast(error.message || 'An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  return (
    <View style={cn(tw.flex, tw['bg-dark-950'])}>
      <KeyboardAvoidingView style={tw.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Toast Notification */}
          {toast && (
            <Animated.View
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 60 : 40,
                left: 20,
                right: 20,
                backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
                padding: 16,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                zIndex: 1000,
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 0],
                    }),
                  },
                ],
              }}
            >
              <Text style={{ color: 'white', fontSize: 18, marginRight: 12 }}>
                {toast.type === 'success' ? '✓' : '✕'}
              </Text>
              <Text style={{ color: 'white', fontSize: 14, flex: 1 }}>
                {toast.message}
              </Text>
            </Animated.View>
          )}

          {/* Header - Compact with pulsing logo */}
          <Animated.View 
            style={cn(tw['items-center'], tw.mb(8), { opacity: fadeAnim, transform: [{ translateY: slideAnim }] })}
          >
            <Logo size={80} isDarkTheme={true} animated={true} showCircle={false} style={{ marginBottom: 16 }} />
            <Text style={cn(tw['text-white'], tw['text-2xl'], tw['font-bold'], tw.mb(1), tw['text-center'])}>
              AlgoPulse
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw['text-center'], tw.mb(3))}>
              Master algorithms through spaced repetition
            </Text>
            <Animated.View 
              style={cn(
                tw.w(16),
                tw.h(0.5),
                tw['bg-primary-500'],
                tw['rounded-full'],
                { opacity: glowOpacity }
              )}
            />
          </Animated.View>

          {/* Form */}
          <Animated.View 
            style={cn(tw.wFull, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] })}
          >
            {/* Email Input */}
            <View style={tw.mb(4)}>
              <TextInput
                style={cn(
                  tw['bg-dark-800'],
                  tw['rounded-lg'],
                  tw.p(4),
                  tw['text-white'],
                  tw['text-base'],
                  tw.border,
                  tw['border-dark-700']
                )}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={tw.mb(4)}>
              <TextInput
                style={cn(
                  tw['bg-dark-800'],
                  tw['rounded-lg'],
                  tw.p(4),
                  tw['text-white'],
                  tw['text-base'],
                  tw.border,
                  tw['border-dark-700']
                )}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Confirm Password Input (Sign Up Only) */}
            {!isLogin && (
              <View style={tw.mb(4)}>
                <TextInput
                  style={cn(
                    tw['bg-dark-800'],
                    tw['rounded-lg'],
                    tw.p(4),
                    tw['text-white'],
                    tw['text-base'],
                    tw.border,
                    password && confirmPassword && password !== confirmPassword 
                      ? cn(tw['border-error'])
                      : tw['border-dark-700']
                  )}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <Text style={cn(tw['text-error'], tw['text-sm'], tw.mt(1), tw.ml(2))}>
                    Passwords do not match
                  </Text>
                )}
              </View>
            )}

            {/* Plan Selection (Sign Up Only) */}
            {!isLogin && (
              <View style={tw.mb(6)}>
                <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw.mb(3), tw['text-center'])}>
                  Choose your plan
                </Text>
                <View style={cn(tw['flex-row'], tw.gap(3))}>
                  <TouchableOpacity
                    style={cn(
                      tw.flex,
                      tw['bg-dark-800'],
                      tw['rounded-lg'],
                      tw.p(4),
                      tw.border,
                      tw['items-center'],
                      plan === 'baseline' 
                        ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                        : tw['border-dark-700']
                    )}
                    onPress={() => setPlan('baseline')}
                  >
                    <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'], tw.mb(1))}>
                      Baseline
                    </Text>
                    <Text style={cn(
                      tw['text-xs'],
                      tw['text-center'],
                      tw['leading-tight'],
                      plan === 'baseline' ? tw['text-white'] : tw['text-dark-400']
                    )}>
                      1-3-7-14-30 day intervals
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={cn(
                      tw.flex,
                      tw['bg-dark-800'],
                      tw['rounded-lg'],
                      tw.p(4),
                      tw.border,
                      tw['items-center'],
                      plan === 'time_crunch' 
                        ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                        : tw['border-dark-700']
                    )}
                    onPress={() => setPlan('time_crunch')}
                  >
                    <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'], tw.mb(1))}>
                      Time Crunch
                    </Text>
                    <Text style={cn(
                      tw['text-xs'],
                      tw['text-center'],
                      tw['leading-tight'],
                      plan === 'time_crunch' ? tw['text-white'] : tw['text-dark-400']
                    )}>
                      1-2-5-10 day intervals
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={cn(
                tw['bg-primary-500'],
                tw['rounded-lg'],
                tw.p(4),
                tw['items-center'],
                tw.mb(4)
              )} 
              onPress={handleAuth} 
              disabled={loading}
            >
              <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'])}>
                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Switch Mode Button */}
            <TouchableOpacity 
              style={cn(tw['items-center'], tw.p(4))}
              onPress={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw['text-center'])}>
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}