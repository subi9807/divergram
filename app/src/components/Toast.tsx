import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} color="#10b981" />;
      case 'error':
        return <AlertCircle size={20} color="#ef4444" />;
      case 'info':
        return <Info size={20} color="#0ea5e9" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View 
        className="absolute left-0 right-0 z-50 px-4"
        style={{ top: insets.top + 10 }}
      >
        {toasts.map((toast) => (
          <Animated.View
            key={toast.id}
            className={`flex-row items-start p-4 rounded-lg border mb-2 ${getToastStyles(toast.type)}`}
          >
            <View className="mr-3 mt-0.5">
              {getToastIcon(toast.type)}
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-secondary-800">
                {toast.title}
              </Text>
              {toast.message && (
                <Text className="text-secondary-600 mt-1">
                  {toast.message}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => removeToast(toast.id)}
              className="ml-3"
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}