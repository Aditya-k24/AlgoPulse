import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProblemController } from '../controllers/ProblemController';
import { AuthController } from '../controllers/AuthController';
import { Problem, Difficulty } from '../models/Problem';
import { tw, cn } from '../styles/tailwind';
import Logo from '../components/Logo';

export default function HomeScreen() {
  const navigation = useNavigation();
  const authController = AuthController.getInstance();
  const problemController = ProblemController.getInstance();
  
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  
  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const categories = problemController.getCategories();
  const difficulties = problemController.getDifficulties();

  useEffect(() => {
    fetchProblems();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchProblems = async () => {
    try {
      const filter = {
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== 'All' ? selectedDifficulty as Difficulty : undefined,
      };
      
      const fetchedProblems = await problemController.fetchProblems(filter);
      setProblems(fetchedProblems);
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProblems();
  };

  const generateNewProblem = async () => {
    try {
      await problemController.generateNewProblem();
    } catch (error: any) {
      Alert.alert(
        'Feature Coming Soon',
        error.message,
        [{ text: 'OK' }]
      );
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Refetch problems with new filter
    setTimeout(() => fetchProblems(), 100);
  };

  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    // Refetch problems with new filter
    setTimeout(() => fetchProblems(), 100);
  };

  return (
    <View style={cn(tw.flex, tw['bg-dark-950'])}>
      {/* Header - Much more compact */}
      <Animated.View 
        style={cn(tw.px(4), tw.py(2), tw.pb(1), { opacity: fadeAnim, transform: [{ translateY: slideAnim }] })}
      >
        <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'])}>
          <View>
            <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-semibold'], tw.mb(0))}>
              Welcome back!
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-xs'])}>
              Ready to train your DSA memory?
            </Text>
          </View>
          <Logo size={28} isDarkTheme={true} showCircle={false} />
        </View>
      </Animated.View>

      <ScrollView
        style={cn(tw.flex, tw.px(4))}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <Animated.View 
          style={cn(tw.mb(3), { opacity: fadeAnim, transform: [{ translateY: slideAnim }] })}
        >
          <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'], tw.mb(2))}>
            Filter by Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw.mb(2)}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={cn(
                  tw['rounded-md'],
                  tw.px(3),
                  tw.py(1),
                  tw.mr(2),
                  tw.border,
                  selectedCategory === category 
                    ? cn(tw['bg-primary-500'], tw['border-primary-500'])
                    : cn(tw['bg-dark-700'], tw['border-dark-600'])
                )}
                onPress={() => handleCategoryChange(category)}
              >
                <Text style={cn(
                  tw['text-sm'],
                  tw['font-medium'],
                  selectedCategory === category ? tw['text-white'] : tw['text-dark-400']
                )}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={cn(tw['text-white'], tw['text-sm'], tw['font-semibold'], tw.mb(2))}>
            Filter by Difficulty
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw.mb(2)}>
            {difficulties.map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={cn(
                  tw['rounded-md'],
                  tw.px(3),
                  tw.py(1),
                  tw.mr(2),
                  tw.border,
                  selectedDifficulty === difficulty 
                    ? cn(tw['bg-primary-500'], tw['border-primary-500'])
                    : cn(tw['bg-dark-700'], tw['border-dark-600'])
                )}
                onPress={() => handleDifficultyChange(difficulty)}
              >
                <Text style={cn(
                  tw['text-sm'],
                  tw['font-medium'],
                  selectedDifficulty === difficulty ? tw['text-white'] : tw['text-dark-400']
                )}>
                  {difficulty}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Generate Button */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <TouchableOpacity 
            style={cn(
              tw['bg-primary-500'],
              tw['rounded-lg'],
              tw.p(4),
              tw['items-center'],
              tw.mb(3)
            )}
            onPress={generateNewProblem}
          >
            <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'])}>
              Generate New Problem
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Problems List */}
        <View style={tw.pb(20)}>
          {loading ? (
            <View style={cn(tw.p(8), tw['items-center'])}>
              <Text style={cn(tw['text-dark-400'], tw['text-base'], tw['text-center'])}>
                Loading problems...
              </Text>
            </View>
          ) : problems.length === 0 ? (
            <View style={cn(tw.p(8), tw['items-center'])}>
              <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-semibold'], tw.mb(2), tw['text-center'])}>
                No problems found
              </Text>
              <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw['text-center'])}>
                Generate your first problem to get started!
              </Text>
            </View>
          ) : (
            problems.map((problem, index) => (
              <Animated.View
                key={problem.id}
                style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
              >
                <TouchableOpacity
                  style={cn(
                    tw['bg-dark-800'],
                    tw['rounded-lg'],
                    tw.p(4),
                    tw.mb(3),
                    tw.border,
                    tw['border-dark-700']
                  )}
                  onPress={() => navigation.navigate('ProblemDetail', { problem })}
                >
                  <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-start'], tw.mb(2))}>
                    <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'], tw.flex, tw.mr(2))}>
                      {problem.title}
                    </Text>
                    <View 
                      style={cn(
                        tw['rounded-sm'],
                        tw.px(2),
                        tw.py(1),
                        { backgroundColor: problemController.getDifficultyColor(problem.difficulty) }
                      )}
                    >
                      <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-semibold'])}>
                        {problem.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text style={cn(tw['text-primary-500'], tw['text-sm'], tw['font-medium'], tw.mb(2))}>
                    {problem.category}
                  </Text>
                  <Text style={cn(tw['text-dark-400'], tw['text-sm'], tw.mb(2))} numberOfLines={2}>
                    {problem.description}
                  </Text>
                  <Text style={cn(tw['text-dark-500'], tw['text-xs'], tw['font-medium'])}>
                    {problem.methods.join(' • ')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}