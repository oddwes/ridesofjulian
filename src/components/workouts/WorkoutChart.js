import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const parseWorkoutData = (workout) => {
  const warmupTime = parseInt(workout.warmup.time);
  const warmupPower = parseInt(workout.warmup.power);

  const workTime = parseInt(workout.intervals.work.time);
  const workPower = parseInt(workout.intervals.work.power);

  const cooldownTime = parseInt(workout.cooldown.time);
  const cooldownPower = parseInt(workout.cooldown.power);

  const workoutData = {
    warmup: [warmupTime, warmupPower],
    intervals: {
      work: [workTime, workPower]
    },
    cooldown: [cooldownTime, cooldownPower],
    count: workout.intervals.count
  };

  if (workout.intervals.rest) {
    const restTime = parseInt(workout.intervals.rest.time);
    const restPower = parseInt(workout.intervals.rest.power);
    workoutData.intervals.rest = [restTime, restPower];
  }

  return workoutData;
};

const getZoneColor = (power) => {
  if (power <= 60) return 'rgba(128, 128, 128, 0.6)'; // Pastel Grey for Zone 1 (Z1)
  if (power <= 75) return 'rgba(0, 0, 255, 0.6)'; // Pastel Blue for Zone 2 (Z2)
  if (power <= 90) return 'rgba(0, 128, 0, 0.6)'; // Pastel Green for Zone 3 (Z3)
  if (power <= 105) return 'rgba(255, 255, 0, 0.6)'; // Pastel Yellow for Zone 4 (Z4)
  return 'rgba(255, 0, 0, 0.6)'; // Pastel Red for Zone 5 (Z5)
};

const generateWorkoutData = (workout) => {
  const { warmup, intervals, cooldown, count } = workout;

  // Construct data for chart
  let currentTime = 0;
  const times = [{ label: 'Warmup Start', time: currentTime, intensity: warmup[1] }];
  currentTime += warmup[0];
  times.push({ label: 'Warmup End', time: currentTime, intensity: warmup[1] });

  for (let i = 0; i < count; i++) {
    times.push({
      label: `Work Interval ${i + 1} Start`,
      time: currentTime,
      intensity: intervals.work[1]
    });
    currentTime += intervals.work[0];
    times.push({
      label: `Work Interval ${i + 1} End`,
      time: currentTime,
      intensity: intervals.work[1]
    });

    if (intervals.rest) {
      times.push({
        label: `Rest Interval ${i + 1} Start`,
        time: currentTime,
        intensity: intervals.rest[1]
      });
      currentTime += intervals.rest[0];
      times.push({
        label: `Rest Interval ${i + 1} End`,
        time: currentTime,
        intensity: intervals.rest[1]
      });
    }
  }

  times.push({ label: 'Cooldown Start', time: currentTime, intensity: cooldown[1] });
  currentTime += cooldown[0];
  times.push({ label: 'Cooldown End', time: currentTime, intensity: cooldown[1] });

  const datasets = times.reduce((acc, entry, index) => {
    if (index === 0) return acc;
    acc.push({
      label: `Segment ${index}`,
      data: [
        { x: times[index - 1].time, y: times[index - 1].intensity },
        { x: entry.time, y: entry.intensity }
      ],
      borderColor: 'orange',
      backgroundColor: getZoneColor(times[index - 1].intensity),
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 1 // Ensure uniform border width
    });
    return acc;
  }, []);

  return {
    datasets: datasets
  };
};

export const WorkoutChart = ({ workout, title, subtitle }) => {
  const parsedWorkout = parseWorkoutData(workout);
  const data = generateWorkoutData(parsedWorkout);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: title
      },
      subtitle: {
        display: true,
        text: subtitle
      },
      tooltip: {
        enabled: false // Hide main tooltip
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: false
        },
        ticks: {
          stepSize: 5
        }
      },
      y: {
        title: {
          display: false
        },
        min: 0,
        max: 140
      }
    }
  };

  return (
    <div className="min-w-96">
      <Line data={data} options={options} />
    </div>
  );
};

export default WorkoutChart;
