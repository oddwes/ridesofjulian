const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

// Configuration
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // Replace with your Strava API token
const BASE_URL = 'https://www.strava.com/api/v3';
const YEAR = 2021; // Replace with your desired year

const getBeginningOfYear = (year) => {
  return dayjs(`${year}-01-01`);
};

const getEndOfYear = (year) => {
  return dayjs(`${year}-12-31`);
};

// Helper function to fetch activities
async function fetchActivities(page = 1, perPage = 100) {
  const firstDayOfYear = getBeginningOfYear(YEAR).valueOf() / 1000;
  const lastDayOfYear = getEndOfYear(YEAR).valueOf() / 1000;
  try {
    const response = await axios.get(`${BASE_URL}/athlete/activities`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      params: {
        after: firstDayOfYear,
        before: lastDayOfYear,
        per_page: perPage,
        page: page
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching activities: ${error.response.data.message}`);
    return [];
  }
}

// Helper function to fetch data streams for an activity
async function fetchActivityStreams(activityId) {
  try {
    const response = await axios.get(`${BASE_URL}/activities/${activityId}/streams`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      params: { keys: 'heartrate,watts', key_by_type: true }
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching streams for activity ${activityId}: ${error.response.data.message}`
    );
    return null;
  }
}

// Main function to gather data and write JSON files
async function exportData() {
  const folderPath = path.join(__dirname, `files/${YEAR}`);

  // Check if the folder exists
  if (!fs.existsSync(folderPath)) {
    // Create the folder if it doesn't exist
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Folder created at: ${folderPath}`);
  } else {
    console.log(`Folder already exists at: ${folderPath}`);
  }

  let page = 1;
  let allActivities = [];
  let activities;

  console.log(`Fetching activities for the year ${YEAR}...`);
  do {
    activities = await fetchActivities(page);
    allActivities = allActivities.concat(activities);
    page++;
  } while (activities.length > 0);

  // Filter activities by year
  const yearActivities = allActivities.filter((activity) => {
    const activityDate = new Date(activity.start_date);
    return activityDate.getFullYear() === YEAR;
  });

  console.log(`Found ${yearActivities.length} activities for the year ${YEAR}.`);

  // Fetch streams for each activity
  for (const activity of yearActivities) {
    const streams = await fetchActivityStreams(activity.id);
    if (streams) {
      const data = {
        heartrate: streams.heartrate ? streams.heartrate.data : null,
        power: streams.watts ? streams.watts.data : null
      };
      const date = dayjs(activity.start_date).format('DD_MM_YYYY');
      const filename = `scripts/files/${YEAR}/activity_${date}.json`;
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`Saved data for activity ${activity.id} to ${filename}`);
    }
  }
  console.log('Data export complete.');
}

// Run the script
exportData();
