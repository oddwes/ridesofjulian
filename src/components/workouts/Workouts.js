import WorkoutChart from './WorkoutChart';
import workoutData from '../../workout_data.json';

export const Workouts = () => {
  const renderCharts = () => {
    const charts = [];
    Object.entries(workoutData).forEach(([week, days]) => {
      Object.entries(days).forEach(([day, { workout }]) => {
        const title = `${week} - ${day}`;
        charts.push(
          <div key={`${week}-${day}`}>
            <WorkoutChart workout={workout} title={title} />
          </div>
        );
      });
    });
    return charts;
  };

  return <div className="grid grid-cols-4 gap-2">{renderCharts()}</div>;
};
