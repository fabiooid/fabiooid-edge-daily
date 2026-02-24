// Determines which theme to use based on the day of the week
function getTodaysTheme() {
  // TESTING: Uncomment one line below to test different days
  // const dayOfWeek = 1; // Monday = AI
  // const dayOfWeek = 2; // Tuesday = Web3
  // const dayOfWeek = 3; // Wednesday = Fintech
  // const dayOfWeek = 4; // Thursday = Energy
  
  // PRODUCTION: Use actual day
  const today = new Date();
  const dayOfWeek = today.getDay();
  
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