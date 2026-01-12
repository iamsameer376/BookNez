// Generate 24-hour time options in 12-hour format
export const generateTimeOptions = () => {
  const times = [];
  
  // Generate from 12:00 AM to 11:00 PM
  for (let hour = 0; hour < 24; hour++) {
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? 'AM' : 'PM';
    const timeString = `${hour12.toString().padStart(2, '0')}:00 ${period}`;
    times.push(timeString);
  }
  
  return times;
};
