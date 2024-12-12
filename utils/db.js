const db = wx.cloud.database();
const clockCollection = db.collection('clock_records');

// 查找今天的记录
async function findTodayRecord(userId, date) {
  try {
    const result = await clockCollection.where({
      userId: userId,
      date: date
    }).get();
    
    return result.data[0] || null;
  } catch (error) {
    console.error('查询记录失败:', error);
    throw error;
  }
}

// 保存新记录
async function saveRecord(record) {
  try {
    return await clockCollection.add({
      data: record
    });
  } catch (error) {
    console.error('保存记录失败:', error);
    throw error;
  }
}

// 更新记录
async function updateRecord(record) {
  try {
    return await clockCollection.doc(record._id).update({
      data: {
        clockInTime: record.clockInTime,
        clockOutTime: record.clockOutTime,
        clockInLocation: record.clockInLocation,
        clockOutLocation: record.clockOutLocation
      }
    });
  } catch (error) {
    console.error('更新记录失败:', error);
    throw error;
  }
}

module.exports = {
  findTodayRecord,
  saveRecord,
  updateRecord
}; 