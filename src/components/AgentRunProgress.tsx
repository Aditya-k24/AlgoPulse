import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { tw, cn } from '../styles/tailwind';
import { PHASES, PHASE_LABEL, type Phase } from '../../shared/agentEvents';
import type { AgentRunState } from '../hooks/agentReducer';

interface Props {
  state: AgentRunState;
  onCancel?: () => void;
}

/** Phases the user is shown. `repair` only appears once it actually happens. */
const VISIBLE: Phase[] = PHASES.filter((p) => p !== 'repair') as Phase[];

function statusOf(
  phase: Phase,
  state: AgentRunState
): 'done' | 'active' | 'pending' {
  if (state.status === 'done') return 'done';
  const seen = state.phaseHistory.indexOf(phase);
  if (seen === -1) return 'pending';
  return state.phase === phase ? 'active' : 'done';
}

export default function AgentRunProgress({ state, onCancel }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  // Follow the stream as it grows — the whole point is watching it arrive.
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [state.text]);

  const repairing = state.phase === 'repair' || state.repairErrors.length > 0;

  return (
    <View
      style={cn(
        tw['bg-dark-900'],
        tw['rounded-2xl'],
        tw.p(5),
        tw.mb(6),
        { borderWidth: 1 },
        repairing ? tw['border-red-500/30'] : tw['border-primary-500/20']
      )}
    >
      <View style={cn(tw['flex-row'], tw['items-center'], tw['justify-between'], tw.mb(4))}>
        <View style={cn(tw['flex-row'], tw['items-center'], tw.gap(2))}>
          {state.status !== 'done' && state.status !== 'failed' ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : null}
          <Text style={cn(tw['text-white'], tw['text-base'], tw['font-semibold'])}>
            {state.status === 'done'
              ? 'Ready'
              : state.status === 'failed'
              ? 'Generation failed'
              : state.status === 'connecting'
              ? 'Connecting'
              : 'Generating'}
          </Text>
          {state.attempt > 1 ? (
            <View style={cn(tw['bg-red-500/20'], tw['rounded-full'], tw.px(2), tw.py(1))}>
              <Text style={cn(tw['text-red-400'], tw['text-xs'])}>attempt {state.attempt}</Text>
            </View>
          ) : null}
        </View>

        {onCancel && state.status !== 'done' ? (
          <TouchableOpacity onPress={onCancel} accessibilityRole="button">
            <Text style={cn(tw['text-gray-400'], tw['text-sm'])}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Phase checklist */}
      <View style={cn(tw.mb(4), tw.gap(1))}>
        {VISIBLE.map((phase) => {
          const s = statusOf(phase, state);
          return (
            <View key={phase} style={cn(tw['flex-row'], tw['items-center'], tw.gap(2))}>
              <Text
                style={cn(tw['text-sm'], {
                  color: s === 'done' ? '#10B981' : s === 'active' ? '#3B82F6' : '#4B5563',
                  width: 18,
                })}
              >
                {s === 'done' ? '✓' : s === 'active' ? '›' : '·'}
              </Text>
              <Text
                style={cn(tw['text-sm'], {
                  color: s === 'pending' ? '#6B7280' : '#D1D5DB',
                })}
              >
                {PHASE_LABEL[phase]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Why it is repairing — the interesting part, so show the real reason */}
      {repairing && state.repairErrors.length > 0 ? (
        <View
          style={cn(
            tw['bg-red-500/20'],
            tw['rounded-xl'],
            tw.p(3),
            tw.mb(4),
            { borderWidth: 1 },
            tw['border-red-500/30']
          )}
        >
          <Text style={cn(tw['text-red-400'], tw['text-xs'], tw.mb(1))}>
            Output failed validation &mdash; correcting
          </Text>
          {state.repairErrors.slice(0, 2).map((err, i) => (
            <Text key={i} style={cn(tw['text-gray-400'], tw['text-xs'], tw.leading(4))}>
              {'• '}
              {err}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Live model output */}
      {state.text.length > 0 ? (
        <View style={cn(tw['bg-dark-950'], tw['rounded-xl'], tw.p(3))}>
          <View style={cn(tw['flex-row'], tw['justify-between'], tw.mb(2))}>
            <Text style={cn(tw['text-gray-500'], tw['text-xs'])}>model output</Text>
            <Text style={cn(tw['text-gray-500'], tw['text-xs'])}>
              {state.text.length} chars
              {state.resets > 0 ? `  ·  ${state.resets} restart${state.resets > 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          <ScrollView ref={scrollRef} style={{ maxHeight: 150 }} nestedScrollEnabled>
            <Text
              style={cn(tw['text-gray-400'], {
                fontFamily: 'monospace',
                fontSize: 11,
                lineHeight: 16,
              })}
            >
              {state.text}
            </Text>
          </ScrollView>
        </View>
      ) : null}

      {state.status === 'failed' && state.error ? (
        <View style={cn(tw['bg-red-500/20'], tw['rounded-xl'], tw.p(3))}>
          <Text style={cn(tw['text-red-400'], tw['text-sm'])}>{state.error}</Text>
        </View>
      ) : null}
    </View>
  );
}
