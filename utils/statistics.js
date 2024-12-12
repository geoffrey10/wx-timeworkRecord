// 计算周平均工时
function calculateWeeklyHours(userId, weekStart, weekEnd) {
  const records = getUserRecords(userId, weekStart, weekEnd);
  let totalHours = 0;
  let daysWorked = 0;
  
  records.forEach(record => {
    if (record.clockInTime && record.clockOutTime) {
      const hours = (record.clockOutTime - record.clockInTime) / (1000 * 60 * 60);
      totalHours += hours;
      daysWorked++;
    }
  });
  
  return totalHours / (daysWorked || 1); // 避免除以0
} 