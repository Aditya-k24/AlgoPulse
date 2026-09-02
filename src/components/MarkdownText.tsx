import React from 'react';
import { View, Text } from 'react-native';
import { tw, cn } from '../styles/tailwind';

interface MarkdownTextProps {
  children: string;
  style?: any;
  textStyle?: any;
}

// Parse and render markdown text
export default function MarkdownText({ children, style, textStyle }: MarkdownTextProps) {
  if (!children) return null;

  const defaultTextStyle = {
    color: '#d1d5db', // text-gray-300
    fontSize: 14,
    lineHeight: 22,
    ...textStyle,
  };

  // Split by code blocks first
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  // Find all code blocks
  const codeBlocks: Array<{ start: number; end: number; content: string }> = [];
  while ((match = codeBlockRegex.exec(children)) !== null) {
    codeBlocks.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1].trim(),
    });
  }

  if (codeBlocks.length === 0) {
    // No code blocks, just render inline markdown
    return (
      <View style={style}>
        <Text style={defaultTextStyle}>
          {renderInlineMarkdown(children, defaultTextStyle)}
        </Text>
      </View>
    );
  }

  // Process text with code blocks
  codeBlocks.forEach((block) => {
    // Add text before code block
    if (block.start > lastIndex) {
      const beforeText = children.substring(lastIndex, block.start);
      parts.push(
        <Text key={`text-${keyCounter++}`} style={defaultTextStyle}>
          {renderInlineMarkdown(beforeText, defaultTextStyle)}
        </Text>
      );
    }

    // Add code block (View, not inside Text)
    parts.push(
      <View key={`code-${keyCounter++}`} style={{
        backgroundColor: '#111827',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
      }}>
        <Text style={{
          color: '#d1d5db',
          fontFamily: 'monospace',
          fontSize: 12,
        }}>
          {block.content}
        </Text>
      </View>
    );

    lastIndex = block.end;
  });

  // Add remaining text
  if (lastIndex < children.length) {
    const afterText = children.substring(lastIndex);
    parts.push(
      <Text key={`text-${keyCounter++}`} style={defaultTextStyle}>
        {renderInlineMarkdown(afterText, defaultTextStyle)}
      </Text>
    );
  }

  return <View style={style}>{parts}</View>;
}

// Render inline markdown (bold, italic, inline code)
function renderInlineMarkdown(text: string, baseStyle: any): React.ReactNode {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // Find all formatting matches
  const matches: Array<{ start: number; end: number; type: 'bold' | 'italic' | 'code'; content: string }> = [];

  // Find bold (**text**)
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  while ((match = boldRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold',
      content: match[1],
    });
  }

  // Find inline code (`text`)
  const codeRegex = /`([^`]+)`/g;
  while ((match = codeRegex.exec(text)) !== null) {
    // Check if not inside a bold match
    const isInBold = matches.some(m => m.type === 'bold' && m.start <= match!.index && match!.index < m.end);
    if (!isInBold) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'code',
        content: match[1],
      });
    }
  }

  // Find italic (*text*) - but not part of bold or code
  const italicRegex = /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g;
  while ((match = italicRegex.exec(text)) !== null) {
    const isInBold = matches.some(m => m.type === 'bold' && m.start <= match!.index && match!.index < m.end);
    const isInCode = matches.some(m => m.type === 'code' && m.start <= match!.index && match!.index < m.end);
    if (!isInBold && !isInCode) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'italic',
        content: match[1],
      });
    }
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start);

  // Build nested Text components
  matches.forEach((m) => {
    // Add plain text before match
    if (m.start > lastIndex) {
      parts.push(text.substring(lastIndex, m.start));
    }

    // Add formatted text
    switch (m.type) {
      case 'bold':
        parts.push(
          <Text key={`bold-${keyCounter++}`} style={{ fontWeight: 'bold', color: '#ffffff' }}>
            {m.content}
          </Text>
        );
        break;
      case 'italic':
        parts.push(
          <Text key={`italic-${keyCounter++}`} style={{ fontStyle: 'italic' }}>
            {m.content}
          </Text>
        );
        break;
      case 'code':
        parts.push(
          <Text key={`code-${keyCounter++}`} style={{
            backgroundColor: '#1f2937',
            color: '#60a5fa',
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: (baseStyle.fontSize || 14) - 1,
          }}>
            {m.content}
          </Text>
        );
        break;
    }

    lastIndex = m.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
