import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { tw, cn } from '../styles/tailwind';
import { RecallService } from '../services/recallService';
import { ExecutionService } from '../services/executionService';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSolved: 0,
    totalRecalls: 0,
    streak: 0,
    categoryStats: {} as Record<string, number>,
  });
  const [upcomingRecalls, setUpcomingRecalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load user stats
      const userStats = await ExecutionService.getUserStats();
      
      // Load recall stats
      const recallStats = await RecallService.getRecallStats();
      
      // Load upcoming recalls
      const upcoming = await RecallService.getUpcomingRecalls(7);

      setStats({
        totalSolved: userStats.successfulAttempts,
        totalRecalls: recallStats.totalScheduled,
        streak: Math.floor(Math.random() * 30), // TODO: Calculate actual streak
        categoryStats: {}, // TODO: Load category stats
      });
      setUpcomingRecalls(upcoming.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getCategoryColor = (category: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const index = category.length % colors.length;
    return colors[index];
  };

  return (
    <View style={cn(tw.flex, tw['bg-dark-950'])}>
      <ScrollView
        style={cn(tw.flex, tw.px(6))}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw.py(6)}>
          <Text style={cn(tw['text-white'], tw['text-3xl'], tw['font-bold'], tw.mb(1))}>
            Your Progress
          </Text>
          <Text style={cn(tw['text-dark-400'], tw['text-base'])}>
            Keep your DSA heartbeat strong
          </Text>
        </View>

        <View style={cn(tw['flex-row'], tw['justify-between'], tw.mb(8), tw.gap(3))}>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw['items-center'], tw.flex, tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-primary-500'], tw['text-3xl'], tw['font-bold'], tw.mb(2))}>
              {stats.totalSolved}
            </Text>
            <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw['text-center'])}>
              PROBLEMS SOLVED
            </Text>
          </View>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw['items-center'], tw.flex, tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-primary-500'], tw['text-3xl'], tw['font-bold'], tw.mb(2))}>
              {stats.totalRecalls}
            </Text>
            <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw['text-center'])}>
              RECALLS SCHEDULED
            </Text>
          </View>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw['items-center'], tw.flex, tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-primary-500'], tw['text-3xl'], tw['font-bold'], tw.mb(2))}>
              {stats.streak}
            </Text>
            <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw['text-center'])}>
              DAY STREAK
            </Text>
          </View>
        </View>

        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            CATEGORY MASTERY
          </Text>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            {Object.entries(stats.categoryStats).length === 0 ? (
              <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw['text-center'])}>
                No category data yet
              </Text>
            ) : (
              Object.entries(stats.categoryStats).map(([category, count]) => (
                <View key={category} style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'], tw.py(2))}>
                  <View style={cn(tw['flex-row'], tw['items-center'])}>
                    <View 
                      style={cn(
                        tw.w(2),
                        tw.h(2),
                        tw['rounded-full'],
                        tw.mr(2),
                        { backgroundColor: getCategoryColor(category) }
                      )}
                    />
                    <Text style={cn(tw['text-white'], tw['text-base'])}>{category}</Text>
                  </View>
                  <Text style={cn(tw['text-primary-500'], tw['text-base'], tw['font-bold'])}>{count}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            UPCOMING RECALLS
          </Text>
          {upcomingRecalls.length === 0 ? (
            <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(6), tw['items-center'], tw.border, tw['border-dark-800'])}>
              <Text style={cn(tw['text-dark-400'], tw['text-base'], tw['text-center'], tw.mb(2))}>
                No recalls scheduled for the next 7 days
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw['text-center'])}>
                Keep solving problems to build your recall schedule!
              </Text>
            </View>
          ) : (
            upcomingRecalls.map((recall, index) => (
              <TouchableOpacity key={index} style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.mb(3), tw['flex-row'], tw['justify-between'], tw['items-center'], tw.border, tw['border-dark-800'])}>
                <View style={tw.flex}>
                  <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'], tw.mb(2))}>
                    Problem Recall
                  </Text>
                  <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
                    Due: {new Date(recall.dueAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={cn(tw['bg-warning'], tw['rounded-full'], tw.px(3), tw.py(1))}>
                  <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-semibold'])}>
                    PENDING
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            YOUR PLAN
          </Text>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-primary-500'], tw['text-base'], tw['font-bold'], tw.mb(2))}>
              {user?.plan === 'baseline' ? 'Baseline Plan' : 'Time Crunch Plan'}
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
              {user?.plan === 'baseline' 
                ? 'Recall intervals: 1, 3, 7, 14, 30 days'
                : 'Recall intervals: 1, 2, 5, 10 days'
              }
            </Text>
          </View>
        </View>

        <View style={tw.mb(8)}>
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            MOTIVATION
          </Text>
          <View style={cn(tw['bg-dark-900'], tw['rounded-2xl'], tw.p(5), tw.border, tw['border-dark-800'])}>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'], { fontStyle: 'italic' }, tw['text-center'], tw['leading-relaxed'])}>
              "Consistency is the key to mastery. Every problem you recall strengthens your algorithmic thinking!"
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}