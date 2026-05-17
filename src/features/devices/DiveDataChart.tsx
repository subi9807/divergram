import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { formatDepth, formatTemperature } from '../../lib/utils';

interface DiveDataChartProps {
  data: {
    timestamp: number;
    depth: number;
    temperature: number;
  }[];
}

export function DiveDataChart({ data }: DiveDataChartProps) {
  const screenWidth = Dimensions.get('window').width;
  
  if (data.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-secondary-600">No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.slice(-6).map((_, index) => `${index * 5}s`),
    datasets: [
      {
        data: data.slice(-6).map(d => d.depth),
        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 8
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#0ea5e9'
    }
  };

  const latestData = data[data.length - 1];

  return (
    <View>
      <View className="flex-row justify-between mb-4">
        <View className="items-center">
          <Text className="text-secondary-600 text-sm">Current Depth</Text>
          <Text className="text-primary-600 font-bold text-lg">
            {formatDepth(latestData.depth)}
          </Text>
        </View>
        
        <View className="items-center">
          <Text className="text-secondary-600 text-sm">Temperature</Text>
          <Text className="text-primary-600 font-bold text-lg">
            {formatTemperature(latestData.temperature)}
          </Text>
        </View>
      </View>

      <LineChart
        data={chartData}
        width={screenWidth - 80}
        height={180}
        chartConfig={chartConfig}
        style={{
          marginVertical: 8,
          borderRadius: 8
        }}
      />
    </View>
  );
}
