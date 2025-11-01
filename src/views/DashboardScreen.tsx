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
      <View style={cn(tw.px(5), tw.pt(15))}>
        <Text style={cn(tw['text-white'], tw['text-3xl'], tw['font-bold'], tw.mb(1))}>
          Your Progress
        </Text>
        <Text style={cn(tw['text-dark-400'], tw['text-base'])}>
          Keep your DSA heartbeat strong
        </Text>
      </View>

      <ScrollView
        style={cn(tw.flex, tw.px(5))}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={cn(tw['flex-row'], tw['justify-between'], tw.mb(6))}>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw['items-center'], tw.flex, tw.mx(1), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-primary-500'], tw['text-2xl'], tw['font-bold'], tw.mb(1))}>
              {stats.totalSolved}
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['text-center'])}>
              Problems Solved
            </Text>
          </View>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw['items-center'], tw.flex, tw.mx(1), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-primary-500'], tw['text-2xl'], tw['font-bold'], tw.mb(1))}>
              {stats.totalRecalls}
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['text-center'])}>
              Recalls Scheduled
            </Text>
          </View>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw['items-center'], tw.flex, tw.mx(1), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-primary-500'], tw['text-2xl'], tw['font-bold'], tw.mb(1))}>
              {stats.streak}
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-xs'], tw['text-center'])}>
              Day Streak
            </Text>
          </View>
        </View>

        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            Category Mastery
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            {Object.entries(stats.categoryStats).map(([category, count]) => (
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
                  <Text style={cn(tw['text-white'], tw['text-sm'])}>{category}</Text>
                </View>
                <Text style={cn(tw['text-primary-500'], tw['text-sm'], tw['font-bold'])}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            Upcoming Recalls
          </Text>
          {upcomingRecalls.length === 0 ? (
            <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(6), tw['items-center'], tw.border, tw['border-dark-700'])}>
              <Text style={cn(tw['text-dark-400'], tw['text-base'], tw['text-center'], tw.mb(2))}>
                No recalls scheduled for the next 7 days
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw['text-center'])}>
                Keep solving problems to build your recall schedule!
              </Text>
            </View>
          ) : (
            upcomingRecalls.map((recall, index) => (
              <TouchableOpacity key={index} style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.mb(2), tw['flex-row'], tw['justify-between'], tw['items-center'], tw.border, tw['border-dark-700'])}>
                <View style={tw.flex}>
                  <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'], tw.mb(1))}>
                    Problem Recall
                  </Text>
                  <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
                    Due: {new Date(recall.dueAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={cn(tw['bg-warning'], tw['rounded-lg'], tw.px(2), tw.py(1))}>
                  <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-bold'])}>
                    Pending
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            Your Plan
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
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

        <View style={tw.mb(6)}>
          <Text style={cn(tw['text-white'], tw['text-xl'], tw['font-bold'], tw.mb(4))}>
            Motivation
          </Text>
          <View style={cn(tw['bg-dark-800'], tw['rounded-lg'], tw.p(4), tw.border, tw['border-dark-700'])}>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'], { fontStyle: 'italic' }, tw['text-center'], tw['leading-normal'])}>
              "Consistency is the key to mastery. Every problem you recall strengthens your algorithmic thinking!"
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}