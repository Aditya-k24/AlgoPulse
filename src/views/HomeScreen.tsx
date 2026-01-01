import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
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
  const [generating, setGenerating] = useState(false);
  const [categories, setCategories] = useState<string[]>(['All']);
  
  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const difficulties = problemController.getDifficulties();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Load categories on initial mount
        const initialCategories = await problemController.getCategories();
        if (initialCategories && Array.isArray(initialCategories)) {
          setCategories(initialCategories);
        }
        
        // Fetch problems
        await fetchProblems();
      } catch (error) {
        console.error('Error initializing:', error);
        // Ensure categories is always an array
        setCategories(['All']);
      }
    };
    
    initialize();
    
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

  useEffect(() => {
    const refetch = async () => {
      if (!loading) {
        await fetchProblems();
      }
    };
    refetch();
  }, [selectedCategory, selectedDifficulty]);

  const fetchProblems = async () => {
    try {
      const filter = {
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== 'All' ? selectedDifficulty as Difficulty : undefined,
      };
      
      const fetchedProblems = await problemController.fetchProblems(filter);
      setProblems(fetchedProblems);
      
      // Update categories list from database (including newly generated ones)
      try {
        const allCategories = await problemController.getCategories();
        if (allCategories && Array.isArray(allCategories)) {
          setCategories(allCategories);
        }
      } catch (error) {
        console.error('Error updating categories:', error);
      }
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

  const generateScale = useState(new Animated.Value(1))[0];

  const generateNewProblem = async () => {
    if (generating) return; // Prevent multiple clicks
    
    setGenerating(true);
    
    try {
      const category = selectedCategory !== 'All' ? selectedCategory : undefined;
      const difficulty = selectedDifficulty !== 'All' ? selectedDifficulty as Difficulty : undefined;
      
      const request = {
        category,
        difficulty,
      };
      
      const newProblem = await problemController.generateNewProblem(request);
      
      // Update categories to include the new problem's category
      try {
        const updatedCategories = await problemController.getCategories();
        if (updatedCategories && Array.isArray(updatedCategories)) {
          setCategories(updatedCategories);
        }
      } catch (error) {
        console.error('Error updating categories after generation:', error);
      }
      
      await fetchProblems();
      (navigation as any).navigate('ProblemDetail', { problem: newProblem });
    } catch (error: any) {
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate new problem. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
  };

  const getGenerateButtonText = () => {
    const hasCategory = selectedCategory !== 'All';
    const hasDifficulty = selectedDifficulty !== 'All';
    
    if (hasCategory && hasDifficulty) {
      return `Generate a ${selectedDifficulty} ${selectedCategory} Problem`;
    } else if (hasCategory) {
      return `Generate a ${selectedCategory} Problem`;
    } else if (hasDifficulty) {
      return `Generate a ${selectedDifficulty} Problem`;
    } else {
      return 'Generate Random Problem';
    }
  };

  return (
    <View style={cn(tw.flex, tw['bg-dark-950'])}>
      {/* Header */}
      <Animated.View 
        style={cn(tw.px(6), tw.pt(20), tw.pb(6), { opacity: fadeAnim, transform: [{ translateY: slideAnim }] })}
      >
        <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-center'])}>
          <View>
            <Text style={cn(tw['text-white'], tw['text-2xl'], tw['font-bold'], tw.mb(1))}>
              Welcome back!
            </Text>
            <Text style={cn(tw['text-dark-400'], tw['text-sm'])}>
              Ready to train your DSA memory?
            </Text>
          </View>
          <Logo size={64} isDarkTheme={true} showCircle={false} animated={true} />
        </View>
      </Animated.View>

      <ScrollView
        style={cn(tw.flex, tw.px(6))}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <Animated.View 
          style={cn(tw.mb(6), { opacity: fadeAnim, transform: [{ translateY: slideAnim }] })}
        >
          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            FILTER BY CATEGORY
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw.mb(4)}>
            {(categories || ['All']).map((category) => (
              <TouchableOpacity
                key={category}
                style={cn(
                  tw['rounded-xl'],
                  tw.px(4),
                  tw.py(2),
                  tw.mr(2),
                  tw.border,
                  selectedCategory === category 
                    ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                    : cn(tw['bg-dark-900'], tw['border-dark-800'])
                )}
                onPress={() => handleCategoryChange(category)}
              >
                <Text style={cn(
                  tw['text-sm'],
                  tw['font-semibold'],
                  selectedCategory === category ? tw['text-primary-500'] : tw['text-dark-400']
                )}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-semibold'], tw.mb(3))}>
            FILTER BY DIFFICULTY
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {difficulties.map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={cn(
                  tw['rounded-xl'],
                  tw.px(4),
                  tw.py(2),
                  tw.mr(2),
                  tw.border,
                  selectedDifficulty === difficulty 
                    ? cn(tw['border-primary-500'], tw['bg-primary-500/10'])
                    : cn(tw['bg-dark-900'], tw['border-dark-800'])
                )}
                onPress={() => handleDifficultyChange(difficulty)}
              >
                <Text style={cn(
                  tw['text-sm'],
                  tw['font-semibold'],
                  selectedDifficulty === difficulty ? tw['text-primary-500'] : tw['text-dark-400']
                )}>
                  {difficulty}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Generate Button */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: generateScale }] }}>
          <TouchableOpacity 
            style={cn(
              tw['bg-primary-600'],
              tw['rounded-lg'],
              tw.p(4),
              tw['items-center'],
              tw.mb(6),
              tw.border,
              tw['border-primary-500'],
              tw['shadow-lg'],
              generating && tw['opacity-70']
            )}
            onPress={generateNewProblem}
            disabled={generating}
            onPressIn={() => {
              if (!generating) {
                Animated.spring(generateScale, {
                  toValue: 0.96,
                  useNativeDriver: true,
                  speed: 20,
                  bounciness: 6,
                }).start();
              }
            }}
            onPressOut={() => {
              if (!generating) {
                Animated.spring(generateScale, {
                  toValue: 1,
                  useNativeDriver: true,
                  speed: 20,
                  bounciness: 6,
                }).start();
              }
            }}
            activeOpacity={generating ? 1 : 0.9}
          >
            <View style={cn(tw['flex-row'], tw['items-center'], tw['justify-center'])}>
              {generating && (
                <ActivityIndicator 
                  size="small" 
                  color="#FFFFFF" 
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={cn(tw['text-white'], tw['text-base'], tw['font-bold'], tw['text-center'])}>
                {generating ? 'Generating...' : getGenerateButtonText()}
            </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Problems List */}
        <View style={tw.pb(8)}>
          {loading ? (
            <View style={cn(tw.p(8), tw['items-center'])}>
              <Text style={cn(tw['text-dark-400'], tw['text-base'], tw['text-center'])}>
                Loading problems...
              </Text>
            </View>
          ) : problems.length === 0 ? (
            <View style={cn(tw.p(8), tw['items-center'])}>
              <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.mb(2), tw['text-center'])}>
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
                style={cn(tw.mb(4), { opacity: fadeAnim, transform: [{ translateY: slideAnim }] })}
              >
                <TouchableOpacity
                  style={cn(
                    tw['bg-dark-900'],
                    tw['rounded-2xl'],
                    tw.p(5),
                    tw.border,
                    tw['border-dark-800']
                  )}
                  onPress={() => (navigation as any).navigate('ProblemDetail', { problem })}
                >
                  <View style={cn(tw['flex-row'], tw['justify-between'], tw['items-start'], tw.mb(3))}>
                    <Text style={cn(tw['text-white'], tw['text-lg'], tw['font-bold'], tw.flex, tw.mr(2))}>
                      {problem.title}
                    </Text>
                    <View 
                      style={cn(
                        tw['rounded-full'],
                        tw.px(3),
                        tw.py(1),
                        { backgroundColor: problemController.getDifficultyColor(problem.difficulty) }
                      )}
                    >
                      <Text style={cn(tw['text-white'], tw['text-xs'], tw['font-semibold'])}>
                        {problem.difficulty.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={cn(tw['bg-dark-800'], tw['rounded-full'], tw['self-start'], tw.px(3), tw.py(1), tw.mb(3))}>
                    <Text style={cn(tw['text-dark-300'], tw['text-xs'], tw['font-medium'])}>
                    {problem.category}
                  </Text>
                  </View>
                  {problem.methods.length > 0 && (
                    <View style={cn(tw['flex-row'], tw['flex-wrap'])}>
                      {problem.methods.slice(0, 4).map((method, idx) => (
                        <View key={idx} style={cn(tw['bg-primary-500/10'], tw['rounded-full'], tw.px(3), tw.py(1), tw.mr(1), tw.mb(1), tw['border'], tw['border-primary-500/20'])}>
                          <Text style={cn(tw['text-primary-400'], tw['text-xs'], tw['font-medium'])}>
                            {method}
                  </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}