// Determines which theme to use based on the day of the week
function getTodaysTheme() {
  // Get current day in Hong Kong timezone
  const today = new Date();
  const hkDate = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
  const dayOfWeek = hkDate.getDay();
  
  // Schedule: Mon=AI, Tue=Web3, Wed=Fintech, Thu=Energy
  const themeSchedule = {
    1: 'AI',        // Monday
    2: 'Web3',      // Tuesday
    3: 'Fintech',   // Wednesday
    4: 'Energy'     // Thursday
  };
  
  return themeSchedule[dayOfWeek] || null;
}

export { getTodaysTheme };