import { useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { FtpData } from '../utils/ftpUtil';

type FTPGraphProps = {
  ftpHistory: FtpData | null | undefined;
  isLoading?: boolean;
};

export function FTPGraph({ ftpHistory, isLoading }: FTPGraphProps) {
  const chartData = useMemo(() => {
    if (!ftpHistory?.ftp || Object.keys(ftpHistory.ftp).length === 0) return null;

    const entries = Object.entries(ftpHistory.ftp)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const monthlyData: Record<string, { date: string; value: number }> = {};
    entries.forEach(({ date, value }) => {
      const monthKey = date.substring(0, 7);
      if (!monthlyData[monthKey] || new Date(date) > new Date(monthlyData[monthKey].date)) {
        monthlyData[monthKey] = { date, value };
      }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    if (sortedMonths.length === 0) return null;

    const firstMonth = sortedMonths[0];
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    
    const startDate = new Date(firstMonth + '-01');
    const endDate = new Date(lastMonth + '-01');
    
    const allMonths: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      allMonths.push(monthKey);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const rawValuesChronological = allMonths.map((month) => {
      return monthlyData[month] ? monthlyData[month].value : null;
    });

    if (rawValuesChronological.every(v => v === null)) return null;

    const labels = allMonths.map(month => {
      const date = new Date(month + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }).reverse();

    const rawValues = rawValuesChronological.reverse();

    const dataPoints = rawValues.map((value, index) => ({
      value: value ?? undefined,
      label: '',
      labelTextStyle: { color: '#94a3b8', fontSize: 9 },
      hideDataPoint: value === null,
    }));

    const yValues = rawValues.filter((v): v is number => v !== null && v > 0);
    if (yValues.length === 0) return null;

    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const yPadding = (maxY - minY) * 0.1 || 10;
    const yAxisMinValue = Math.floor(minY - yPadding);
    const yAxisMaxValue = maxY;
    const maxValueFromOffset = yAxisMaxValue - yAxisMinValue;

    return {
      data: dataPoints,
      labels,
      yAxisMin: yAxisMinValue,
      yAxisMax: yAxisMaxValue,
      maxValueFromOffset,
      spacing: Math.max(10, (Dimensions.get('window').width - 80) / labels.length),
    };
  }, [ftpHistory]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      </View>
    );
  }

  if (!chartData) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No FTP data available</Text>
        </View>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(screenWidth - 32, chartData.data.length * chartData.spacing);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: chartWidth, height: 256 }}>
          <LineChart
            data={chartData.data}
            width={chartWidth}
            height={200}
            spacing={chartData.spacing}
            thickness={2}
            color="#6366f1"
            areaChart
            startFillColor="rgba(99, 102, 241, 0.2)"
            endFillColor="rgba(99, 102, 241, 0.05)"
            startOpacity={0.8}
            endOpacity={0.1}
            backgroundColor="transparent"
            hideYAxisText={false}
            hideRules={false}
            rulesColor="#334155"
            rulesType="solid"
            initialSpacing={5}
            yAxisColor="#64748b"
            xAxisColor="#64748b"
            yAxisTextStyle={{ color: '#94a3b8', fontSize: 12 }}
            yAxisLabelSuffix="W"
            yAxisOffset={chartData.yAxisMin}
            xAxisLabelTextStyle={{ color: 'transparent', fontSize: 0 }}
            maxValue={chartData.maxValueFromOffset}
            curved={false}
            isAnimated
            animationDuration={400}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loadingContainer: {
    height: 256,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyContainer: {
    height: 256,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
