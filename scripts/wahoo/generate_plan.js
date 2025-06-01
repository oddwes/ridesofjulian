const axios = require('axios');
const qs = require('qs');

const ACCESS_TOKEN = 'L_-A6uHYTaVkOorIW2Bo0nAVHPOEVIHqtH-UHXAB53A';

/**
 * Convert a workout object to Wahoo-compatible plan JSON.
 * @param {Object} workout - The workout object.
 * @param {string} ftp - The athlete's Functional Threshold Power (FTP).
 * @returns {Object} - The Wahoo-compatible plan JSON.
 */
function convertToWahooPlan(workout, ftp) {
  const plan = {
    header: {
      name: workout.title,
      version: '1.0.0',
      description: generateDescription(workout),
      workout_type_family: 0, // 0 for Biking
      workout_type_location: 0, // 0 for Indoor
      ftp: ftp
    },
    intervals: []
  };

  // Add warmup interval
  plan.intervals.push({
    name: 'Warmup',
    exit_trigger_type: 'time',
    exit_trigger_value: parseTimeToSeconds(workout.workout.warmup.time),
    intensity_type: 'wu',
    targets: [
      {
        type: 'ftp',
        low: parsePowerToFTP(workout.workout.warmup.power),
        high: parsePowerToFTP(workout.workout.warmup.power)
      }
    ]
  });

  // Add intervals
  for (let i = 0; i < workout.workout.intervals.count; i++) {
    plan.intervals.push({
      name: `Interval ${i + 1} Work`,
      exit_trigger_type: 'time',
      exit_trigger_value: parseTimeToSeconds(workout.workout.intervals.work.time),
      intensity_type: 'active',
      targets: [
        {
          type: 'ftp',
          low: parsePowerToFTP(workout.workout.intervals.work.power),
          high: parsePowerToFTP(workout.workout.intervals.work.power)
        }
      ]
    });
    if (workout.workout.intervals.rest) {
      plan.intervals.push({
        name: `Interval ${i + 1} Rest`,
        exit_trigger_type: 'time',
        exit_trigger_value: parseTimeToSeconds(workout.workout.intervals.rest.time),
        intensity_type: 'recover',
        targets: [
          {
            type: 'ftp',
            low: parsePowerToFTP(workout.workout.intervals.rest.power),
            high: parsePowerToFTP(workout.workout.intervals.rest.power)
          }
        ]
      });
    }
  }

  // Add cooldown interval
  plan.intervals.push({
    name: 'Cooldown',
    exit_trigger_type: 'time',
    exit_trigger_value: parseTimeToSeconds(workout.workout.cooldown.time),
    intensity_type: 'cd',
    targets: [
      {
        type: 'ftp',
        low: parsePowerToFTP(workout.workout.cooldown.power),
        high: parsePowerToFTP(workout.workout.cooldown.power)
      }
    ]
  });

  return plan;
}

/**
 * Generate a description from the workout object.
 * @param {Object} workout - The workout object.
 * @returns {string} - A descriptive string for the workout.
 */
function generateDescription(workout) {
  let description = `Warmup: ${workout.workout.warmup.time} at ${workout.workout.warmup.power}. Intervals: ${workout.workout.intervals.count}x ${workout.workout.intervals.work.time} at ${workout.workout.intervals.work.power}`;
  if (workout.workout.rest) {
    description += ` with ${workout.workout.intervals.rest.time} rest at ${workout.workout.intervals.rest.power}`;
  }
  description += `. Cooldown: ${workout.workout.cooldown.time} at ${workout.workout.cooldown.power}.`;
  return description;
}

/**
 * Convert time in "X minutes" format to seconds.
 * @param {string} time - Time string (e.g., "10 minutes").
 * @returns {number} - Time in seconds.
 */
function parseTimeToSeconds(time) {
  const [value, unit] = time.split(' ');
  if (unit.startsWith('minute')) {
    return parseInt(value, 10) * 60;
  }
  return parseInt(value, 10);
}

/**
 * Convert time in "X minutes" format to a number of minutes.
 * @param {string} timeString - Time string (e.g., "10 minutes").
 * @returns {number} - Time in minutes.
 */
function parseTimeToMinutes(timeString) {
  const [value, unit] = timeString.split(' ');
  if (unit.startsWith('minute')) {
    return parseInt(value, 10);
  }
  return 0; // Return 0 if the unit is not recognized
}

/**
 * Convert power percentage to a fraction of FTP.
 * @param {string} power - Power string (e.g., "50% FTP").
 * @returns {number} - Fraction of FTP.
 */
function parsePowerToFTP(power) {
  const percentage = parseInt(power.replace('% FTP', ''), 10);
  return percentage / 100;
}

/**
 * Find the first object with a matching external_id from the Wahoo API.
 * @param {string} externalId - The external_id to search for.
 * @param {string} accessToken - The access token for authorization.
 * @returns {Promise<Object|null>} - The matching object or null if not found.
 */
async function findPlanByExternalId(externalId) {
  const url = 'https://api.wahooligan.com/v1/plans';

  try {
    // Query the Wahoo API
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`
      }
    });

    // Extract plans from the response
    const plans = response.data;

    // Find the first object with a matching external_id
    const matchingPlan = plans.find((plan) => plan.external_id === externalId);

    return matchingPlan || null; // Return the object or null if not found
  } catch (error) {
    console.error(
      'Error querying Wahoo API:',
      error.response ? error.response.data : error.message
    );
    throw error; // Rethrow the error for further handling
  }
}

// Function to upload a Wahoo workout plan
async function uploadPlan(workout, wahooPlan) {
  const url = 'https://api.wahooligan.com/v1/plans';
  const encodedWorkout = Buffer.from(JSON.stringify(wahooPlan)).toString('base64');
  // Data for the request
  const data = qs.stringify({
    'plan[file]': `data:application/json;base64,${encodedWorkout}`,
    'plan[external_id]': workout.title,
    'plan[provider_updated_at]': new Date().toISOString() // Current time in ISO 8601 format
  });

  // Headers for the request
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  try {
    // Sending the POST request
    const response = await axios.post(url, data, { headers });
    console.log('Response data:', response.data);
    return response;
  } catch (error) {
    if (error.response) {
      if (error.response.data.error.includes('already exists')) {
        const existingPlan = await findPlanByExternalId(workout.title);
        return existingPlan;
      } else {
        console.log('Error uploading the plan:', error.response.data);
      }
    } else {
      console.error('Error uploading the plan:', error.message);
    }
  }
}

/**
 * Create a workout using the Wahoo API.
 * @param {Object} workout - Details of the workout to be created.
 * @param {string} plan - Wahoo plan object
 * @returns {Promise<Object>} - The API response.
 */
async function createWorkout(workout, plan, weekday) {
  const url = 'https://api.wahooligan.com/v1/workouts';

  const start = getWorkoutDate(weekday);

  // Prepare data in application/x-www-form-urlencoded format
  const data = qs.stringify({
    'workout[name]': plan.name,
    'workout[workout_type_id]': 0,
    'workout[starts]': start,
    'workout[minutes]': calculateTotalWorkoutTime(workout),
    'workout[plan_id]': plan.id,
    'workout[workout_token]': plan.name
  });

  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log('Workout created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating workout:', error.response ? error.response.data : error.message);
    throw error;
  }
}

function getWorkoutDate(weekday) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  const targetDayIndex = weekdays.indexOf(weekday);
  if (targetDayIndex === -1) {
    throw new Error(
      'Invalid weekday name. Use: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, or Saturday.'
    );
  }

  const difference = targetDayIndex - currentDayIndex;
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + difference);

  return targetDate;
}

/**
 * Calculate the total workout time.
 * @param {Object} workout - The workout object.
 * @returns {number} - Total workout time in minutes.
 */
function calculateTotalWorkoutTime(workout) {
  // Parse warmup time
  const warmupTime = parseTimeToMinutes(workout.workout.warmup.time);

  // Parse intervals time (work time * count)
  const intervalWorkTime =
    parseTimeToMinutes(workout.workout.intervals.work.time) * workout.workout.intervals.count;

  // Parse cooldown time
  const cooldownTime = parseTimeToMinutes(workout.workout.cooldown.time);

  // Total workout time
  return warmupTime + intervalWorkTime + cooldownTime;
}

const workouts = {
  Monday: {
    workout: {
      warmup: {
        power: '50% FTP',
        time: '15 minutes'
      },
      intervals: {
        work: {
          power: '80% FTP',
          time: '20 minutes'
        },
        rest: {
          power: '50% FTP',
          time: '0 minutes'
        },
        count: 1
      },
      cooldown: {
        power: '50% FTP',
        time: '15 minutes'
      }
    },
    title: '1x20min Threshold'
  },
  Wednesday: {
    workout: {
      warmup: {
        power: '50% FTP',
        time: '10 minutes'
      },
      intervals: {
        work: {
          power: '110% FTP',
          time: '4 minutes'
        },
        rest: {
          power: '50% FTP',
          time: '4 minutes'
        },
        count: 5
      },
      cooldown: {
        power: '50% FTP',
        time: '10 minutes'
      }
    },
    title: '5x4min VO2 Max'
  },
  Friday: {
    workout: {
      warmup: {
        power: '50% FTP',
        time: '10 minutes'
      },
      intervals: {
        work: {
          power: '85% FTP',
          time: '20 minutes'
        },
        rest: {
          power: '50% FTP',
          time: '5 minutes'
        },
        count: 4
      },
      cooldown: {
        power: '50% FTP',
        time: '10 minutes'
      }
    },
    title: '4x20min Low Threshold'
  },
  Sunday: {
    workout: {
      warmup: {
        power: '50% FTP',
        time: '15 minutes'
      },
      intervals: {
        work: {
          power: '70% FTP',
          time: '120 minutes'
        },
        rest: {
          power: 'None% FTP',
          time: 'None minutes'
        },
        count: 1
      },
      cooldown: {
        power: '50% FTP',
        time: '15 minutes'
      }
    },
    title: '1x120min Tempo'
  }
};

const ftp = 230;

Object.entries(workouts).forEach(([weekday, workout]) => {
  const wahooPlan = convertToWahooPlan(workout, ftp);
  uploadPlan(workout, wahooPlan).then((plan) => {
    createWorkout(workout, plan, weekday);
  });
});
