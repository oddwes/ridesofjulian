import WorkoutChart from './WorkoutChart';
import workoutData from '../../training_plans/ftp_training_plan_4_days.json';

export const Workouts = () => {
  const renderCharts = () => {
    const charts = [];

    Object.entries(workoutData).forEach(([week, days]) => {
      const weekCharts = [];
      Object.entries(days).forEach(([day, { workout, title }]) => {
        const subtitle = `${week} - ${day}`;
        weekCharts.push(
          <div key={`${week}-${day}`}>
            <WorkoutChart workout={workout} title={subtitle} subtitle={title} />
          </div>
        );
      });

      charts.push(
        <div key={week} className="flex flex-row gap-2">
          {weekCharts}
        </div>
      );
    });

    return charts;
  };

  return <div className="grid gap-2 overflow-x-scroll w-full p-2">{renderCharts()}</div>;
};
