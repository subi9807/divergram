import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

const buttonVariants = cva(
  'min-h-12 flex-row items-center justify-center rounded-2xl border active:opacity-90 disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border-brand-600 bg-brand-600 shadow-sm shadow-brand-300',
        secondary: 'border-surface-200 bg-white',
        outline: 'border-surface-300 bg-surface-50',
        ghost: 'border-transparent bg-transparent',
        danger: 'border-danger-600 bg-danger-600 shadow-sm shadow-danger-300',
      },
      size: {
        sm: 'px-3 py-2',
        md: 'px-4 py-3',
        lg: 'px-6 py-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

const textVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-surface-800',
      outline: 'text-surface-800',
      ghost: 'text-surface-700',
      danger: 'text-white',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-base',
    },
  },
});

interface ButtonProps
  extends VariantProps<typeof buttonVariants>,
    React.ComponentProps<typeof Pressable> {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  textClassName?: string;
  contentClassName?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  className,
  textClassName,
  contentClassName,
  ...props
}: ButtonProps) {
  const { isDark } = useResolvedTheme();
  const showText = typeof children === 'string' || typeof children === 'number';
  const indicatorColor = variant === 'primary' || variant === 'danger' ? '#ffffff' : isDark ? '#e2e8f0' : '#334155';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={showText ? String(children) : undefined}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      className={cn(buttonVariants({ variant, size }), isDark && ['secondary', 'outline'].includes(variant || '') && 'border-slate-700 bg-slate-800', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : showText ? (
        <Text className={cn(textVariants({ variant, size }), isDark && !['primary', 'danger'].includes(variant || '') && 'text-slate-100', textClassName)}>{children}</Text>
      ) : (
        <View className={cn('flex-row items-center justify-center', contentClassName)}>{children}</View>
      )}
    </Pressable>
  );
}
