import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { tw, cn } from '../styles/tailwind';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/notificationService';
import { RecallService } from '../services/recallService';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [updating, setUpdating] = useState(false);

  const handlePlanChange = (newPlan: 'baseline' | 'time_crunch') => {
    Alert.alert(
      'Change Plan',
      `Are you sure you want to change to ${newPlan === 'baseline' ? 'Baseline' : 'Time Crunch'} plan? This will reschedule all your recalls.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              // Update profile
              const { error } = await supabase
                .from('profiles')
                .update({ plan: newPlan })
                .eq('user_id', user?.id);

              if (error) throw error;

              Alert.alert('Success', 'Plan updated successfully!');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await NotificationService.requestPermissions();
        await NotificationService.scheduleTestNotification();
        Alert.alert('Success', 'Notifications enabled!');
      } else {
        await NotificationService.cancelAllNotifications();
        Alert.alert('Success', 'Notifications disabled!');
      }
      setNotificationsEnabled(enabled);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your progress, attempts, and recalls. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all user data
              await RecallService.clearAllRecalls();
              Alert.alert('Success', 'All data cleared successfully!');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={cn(tw.flex, tw['bg-dark-950'])}>
      <View style={cn(tw.px(5), tw.pt(15))}>
        <Text style={cn(tw['text-white'], tw['text-3xl'], tw['font-bold'], tw.mb(1))}>
          Settings
        </Text>
        <Text style={cn(tw['text-dark-400'], tw['text-base'])}>
          Customize your AlgoPulse experience
        </Text>
      </View>

      <ScrollView style={cn(tw.flex, tw.px(5))}>
        {/* User Info */}
        <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.mb(6), tw.border, tw['border-dark-700'])}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(2))}>
            Account Information
          </Text>
          <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw.mb(1))}>
            Email: {user?.email}
          </Text>
          <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
            Plan: {user?.plan === 'baseline' ? 'Baseline' : 'Time Crunch'}
          </Text>
        </View>

        {/* Plan Settings */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            Recall Plan
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <TouchableOpacity
              style={cn(
                tw.p(4),
                tw['rounded-lg'],
                tw.mb(2),
                tw.border,
                user?.plan === 'baseline' 
                  ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                  : tw['border-dark-600']
              )}
              onPress={() => handlePlanChange('baseline')}
              disabled={updating}
            >
              <Text style={cn(
                tw['text-base'],
                tw['font-semibold'],
                tw.mb(1),
                user?.plan === 'baseline' ? tw['text-primary-500'] : tw['text-white']
              )}>
                Baseline Plan
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
                Recall intervals: 1, 3, 7, 14, 30 days
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw.mt(1))}>
                Recommended for steady progress
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={cn(
                tw.p(4),
                tw['rounded-lg'],
                tw.border,
                user?.plan === 'time_crunch' 
                  ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                  : tw['border-dark-600']
              )}
              onPress={() => handlePlanChange('time_crunch')}
              disabled={updating}
            >
              <Text style={cn(
                tw['text-base'],
                tw['font-semibold'],
                tw.mb(1),
                user?.plan === 'time_crunch' ? tw['text-primary-500'] : tw['text-white']
              )}>
                Time Crunch Plan
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
                Recall intervals: 1, 2, 5, 10 days
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw.mt(1))}>
                Faster learning for time-constrained users
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            Notifications
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'])}>
              <View style={tw.flex}>
                <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw.mb(1))}>
                  Recall Reminders
                </Text>
                <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
                  Get notified when it's time to recall a problem
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#374151', true: '#3B82F6' }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            Data Management
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <TouchableOpacity
              style={cn(tw.p(4), tw['rounded-lg'], tw.border, tw['border-dark-600'], tw.mb(2))}
              onPress={handleClearData}
            >
              <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw.mb(1))}>
                Clear All Data
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
                Delete all your progress, attempts, and recalls
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Information */}
        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            About
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw.mb(1))}>
              AlgoPulse
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw.mb(2))}>
              Version 1.0.0
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
              Master algorithms through spaced repetition
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <View style={tw.mb(8)}>
          <TouchableOpacity
            style={cn(tw['bg-error'], tw['rounded-lg'], tw.p(4), tw['items-center'])}
            onPress={handleSignOut}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'])}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}