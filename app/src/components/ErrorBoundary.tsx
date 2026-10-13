import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react-native';
import i18n from '../lib/i18n';
import { Sentry } from '../lib/sentry';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center px-8 bg-white">
          <AlertTriangle size={64} color="#ef4444" />
          <Text className="text-2xl font-bold text-secondary-800 mt-6 mb-2 text-center">
            {i18n.t('common.unexpectedErrorTitle')}
          </Text>
          <Text className="text-secondary-600 text-center mb-8 leading-6">
            {i18n.t('common.unexpectedErrorBody')}
          </Text>
          <Button 
            onPress={() => this.setState({ hasError: false })}
            variant="primary"
          >
            {i18n.t('common.tryAgain')}
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}
