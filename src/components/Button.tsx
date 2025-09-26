import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  "items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary-500 active:bg-primary-600",
        secondary: "bg-white border border-primary-500 active:bg-primary-50",
        outline: "border border-secondary-300 bg-white active:bg-secondary-50",
        ghost: "active:bg-secondary-100",
        danger: "bg-danger-500 active:bg-danger-600"
      },
      size: {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-base",
        lg: "px-6 py-4 text-lg"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

const textVariants = cva("font-semibold", {
  variants: {
    variant: {
      primary: "text-white",
      secondary: "text-primary-500",
      outline: "text-secondary-700",
      ghost: "text-secondary-700",
      danger: "text-white"
    },
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg"
    }
  }
});

interface ButtonProps 
  extends VariantProps<typeof buttonVariants>,
    React.ComponentProps<typeof TouchableOpacity> {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ 
  children, 
  variant, 
  size, 
  loading, 
  disabled,
  className,
  ...props 
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' || variant === 'danger' ? 'white' : '#0ea5e9'} 
        />
      ) : (
        <Text className={cn(textVariants({ variant, size }))}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}