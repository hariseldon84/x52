import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface SearchSuggestion {
  id: string;
  text: string;
  category?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  suggestions?: SearchSuggestion[];
  onSuggestionPress?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
  theme?: 'light' | 'dark';
  animated?: boolean;
  cancelable?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = 'Search...',
  value: externalValue,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  suggestions = [],
  onSuggestionPress,
  showSuggestions = true,
  theme = 'light',
  animated = true,
  cancelable = true,
  autoFocus = false,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  const animatedValue = useSharedValue(0);
  const value = externalValue !== undefined ? externalValue : internalValue;

  useEffect(() => {
    if (animated) {
      animatedValue.value = withSpring(isFocused ? 1 : 0);
    }
  }, [isFocused, animated]);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleChangeText = (text: string) => {
    if (externalValue === undefined) {
      setInternalValue(text);
    }
    onChangeText?.(text);
  };

  const handleSubmit = () => {
    onSubmit?.(value);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    if (externalValue === undefined) {
      setInternalValue('');
    }
    onChangeText?.('');
    inputRef.current?.focus();
  };

  const handleCancel = () => {
    if (externalValue === undefined) {
      setInternalValue('');
    }
    onChangeText?.('');
    inputRef.current?.blur();
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    if (externalValue === undefined) {
      setInternalValue(suggestion.text);
    }
    onChangeText?.(suggestion.text);
    onSuggestionPress?.(suggestion);
    inputRef.current?.blur();
  };

  const containerStyle = useAnimatedStyle(() => {
    if (!animated) return {};

    const scale = interpolate(
      animatedValue.value,
      [0, 1],
      [1, 1.02],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  const cancelButtonStyle = useAnimatedStyle(() => {
    if (!animated || !cancelable) return { opacity: 0, width: 0 };

    const opacity = interpolate(
      animatedValue.value,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP
    );

    const width = interpolate(
      animatedValue.value,
      [0, 1],
      [0, 70],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      width,
    };
  });

  const styles = createStyles(theme, isFocused);
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.searchContainer, containerStyle]}>
        <View style={styles.inputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={styles.searchIcon.color}
            style={styles.searchIcon}
          />
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={styles.placeholder.color}
            value={value}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus={autoFocus}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
          />

          {value.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={styles.clearIcon.color}
              />
            </TouchableOpacity>
          )}
        </View>

        {cancelable && (
          <Animated.View style={[styles.cancelContainer, cancelButtonStyle]}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

      {/* Suggestions */}
      {showSuggestions && isFocused && filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={filteredSuggestions}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
                activeOpacity={0.7}
              >
                {item.icon && (
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={styles.suggestionIcon.color}
                    style={styles.suggestionIcon}
                  />
                )}
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText}>{item.text}</Text>
                  {item.category && (
                    <Text style={styles.suggestionCategory}>{item.category}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: 'light' | 'dark', isFocused: boolean) => {
  const isDark = theme === 'dark';
  
  return StyleSheet.create({
    container: {
      position: 'relative',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    inputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      borderWidth: 2,
      borderColor: isFocused 
        ? (isDark ? '#3b82f6' : '#2563eb')
        : 'transparent',
    },
    searchIcon: {
      color: isDark ? '#9ca3af' : '#6b7280',
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      ...Platform.select({
        web: {
          outlineStyle: 'none',
        },
      }),
    },
    placeholder: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
    clearIcon: {
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    cancelContainer: {
      overflow: 'hidden',
    },
    cancelButton: {
      paddingLeft: 12,
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    },
    cancelText: {
      fontSize: 16,
      color: isDark ? '#3b82f6' : '#2563eb',
      fontWeight: '500',
    },
    suggestionsContainer: {
      position: 'absolute',
      top: '100%',
      left: 16,
      right: 16,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      marginTop: 4,
      maxHeight: 200,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
      zIndex: 1000,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#f3f4f6',
    },
    suggestionIcon: {
      color: isDark ? '#9ca3af' : '#6b7280',
      marginRight: 12,
    },
    suggestionContent: {
      flex: 1,
    },
    suggestionText: {
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      fontWeight: '500',
    },
    suggestionCategory: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 2,
    },
  });
};