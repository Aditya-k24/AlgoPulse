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
        await NotificationService.clearAllNotifications();
        Alert.alert('Success', 'Notifications enabled!');
      } else {
        await NotificationService.clearAllNotifications();
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
      <ScrollView style={cn(tw.flex, tw.px(6))} showsVerticalScrollIndicator={false}>
        <View style={tw.py(6)}>
          <Text style={cn(tw['text-white'], tw['text-3xl'], tw['font-bold'], tw.mb(1))}>
            Settings
          </Text>
          <Text style={cn(tw['text-dark-400'], tw['text-base'])}>
            Customize your AlgoPulse experience
          </Text>
        </View>

        {/* User Info */}
        <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.mb(8), tw.border, tw['border-dark-800'])}>
          <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(3))}>
            Account Information
          </Text>
          <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw.mb(2))}>
            Email: {user?.email}
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-full'], tw['self-start'], tw.px(3), tw.py(1))}>
            <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-medium'])}>
              {user?.plan === 'baseline' ? 'Baseline' : 'Time Crunch'}
            </Text>
          </View>
        </View>

        {/* Plan Settings */}
        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            RECALL PLAN
          </Text>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            <TouchableOpacity
              style={cn(
                tw.p(5),
                tw['rounded-xl'],
                tw.mb(3),
                tw.border,
                user?.plan === 'baseline' 
                  ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                  : tw['border-dark-800']
              )}
              onPress={() => handlePlanChange('baseline')}
              disabled={updating}
            >
              <Text style={cn(
                tw['text-base'],
                tw['font-bold'],
                tw.mb(2),
                user?.plan === 'baseline' ? tw['text-primary-500'] : tw['text-white']
              )}>
                Baseline Plan
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw.mb(1))}>
                Recall intervals: 1, 3, 7, 14, 30 days
              </Text>
              <Text style={cn(tw['text-dark-500'], tw['text-xs'])}>
                Recommended for steady progress
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={cn(
                tw.p(5),
                tw['rounded-xl'],
                tw.border,
                user?.plan === 'time_crunch' 
                  ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                  : tw['border-dark-800']
              )}
              onPress={() => handlePlanChange('time_crunch')}
              disabled={updating}
            >
              <Text style={cn(
                tw['text-base'],
                tw['font-bold'],
                tw.mb(2),
                user?.plan === 'time_crunch' ? tw['text-primary-500'] : tw['text-white']
              )}>
                Time Crunch Plan
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw.mb(1))}>
                Recall intervals: 1, 2, 5, 10 days
              </Text>
              <Text style={cn(tw['text-dark-500'], tw['text-xs'])}>
                Faster learning for time-constrained users
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            NOTIFICATIONS
          </Text>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'])}>
              <View style={tw.flex}>
                <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'], tw.mb(2))}>
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

            {/* Debug tools */}
            <View style={cn(tw['flex-row'], tw.mt(4))}>
              <TouchableOpacity
                style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(3), tw.mr(2), tw.border, tw['border-dark-700'])}
                onPress={async () => {
                  try {
                    const upcoming = await NotificationService.getUpcomingNotifications();
                    const list = upcoming.map(n => `• ${(n.trigger as any)?.date || n.trigger}`).join('\n') || 'None scheduled';
                    Alert.alert('Upcoming Notifications', list);
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to fetch notifications');
                  }
                }}
              >
                <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-semibold'])}>Show Upcoming</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(3), tw.border, tw['border-dark-700'])}
                onPress={async () => {
                  try {
                    const { getAllSolvedAt } = await import('../utils/storage');
                    const map = await getAllSolvedAt();
                    const list = Object.entries(map).map(([id, iso]) => `• ${id}: ${iso}`).join('\n') || 'No solved dates';
                    Alert.alert('Solved Dates', list);
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to fetch solved dates');
                  }
                }}
              >
                <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-semibold'])}>Show Solved Dates</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            DATA MANAGEMENT
          </Text>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            <TouchableOpacity
              style={cn(tw.p(5), tw['rounded-xl'], tw.border, tw['border-dark-800'])}
              onPress={handleClearData}
            >
              <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'], tw.mb(2))}>
                Clear All Data
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
                Delete all your progress, attempts, and recalls
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Information */}
        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            ABOUT
          </Text>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'], tw.mb(2))}>
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
            style={cn(tw['bg-error'], tw['rounded-xl'], tw.p(5), tw['items-center'])}
            onPress={handleSignOut}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'])}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}