// This script is intended to be run as a cron job to generate monthly banking statements.
// It fetches the CRON_SECRET from environment variables, calls the banking API to generate statements,
const nodeFetch = require('node-fetch');

async function generateMonthlyStatements() {
  try {
    // Get CRON_SECRET from environment
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return;
    }
    
    // Call the statement generation API
    const response = await nodeFetch(`${process.env.BASE_URL}/api/banking/generate-statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    });
    
    const result = await response.json();
    console.log('Statement generation results:', result);
  } catch (error) {
    console.error('Error generating statements:', error);
  }
}

// Run the function
generateMonthlyStatements();