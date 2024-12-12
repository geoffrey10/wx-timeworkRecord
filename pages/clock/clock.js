const { isValidLocation, COMPANY_LOCATION } = require('../../utils/location.js');
const { setClockReminder } = require('../../utils/reminder.js');
Page({
  data: {
    currentTime: '',
    currentDate: '',
    todayRecord: null,
    userId: '', // 用户ID将从登录后获取
    userName: '' // 用户名将从登录后获取
  },

  onLoad() {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    console.log('当前用户信息：', userInfo);  // 添加日志
    if (userInfo) {
      this.setData({
        userId: userInfo._openid,
        userName: userInfo.nickName
      });
    } else {
      console.log('未获取到用户信息');  // 添加日志
      // 跳转到登录页面或显示登录提示
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
    }
    
    this.updateTime();
    this.getTodayRecord();

    
    this.updateTime();
    // 每秒更新时间显示
    setInterval(() => {
      this.updateTime();
    }, 1000);
    
    // 获取今日打卡记录
    this.getTodayRecord();
    
    // 设置打卡提醒
    setClockReminder();
  },

  updateTime() {
    const now = new Date();
    this.setData({
      currentTime: now.toLocaleTimeString('zh-CN'),
      currentDate: now.toLocaleDateString('zh-CN')
    });
  },

  async getTodayRecord() {
    try {
      const db = wx.cloud.database();
      const today = new Date().toISOString().split('T')[0];
      const record = await db.collection('attendance_records')
        .where({
          userId: this.data.userId,
          date: today
        })
        .get();
      
      if (record.data.length > 0) {
        this.setData({ todayRecord: record.data[0] });
      } else {
        this.setData({ todayRecord: null });
      }
    } catch (error) {
      console.error('获取打卡记录失败:', error);
    }
  },

  async handleClockIn() {
    try {
      // 先检查是否已登录
      if (!this.data.userId) {
        console.log('用户未登录');  // 添加日志
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      // 获取位置信息
      const location = await wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 3000
      });
      
      console.log('获取到的位置信息:', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        time: new Date().toLocaleString()
      });

      // 验证位置
      if (!isValidLocation(location)) {
        console.error('上班打卡失败: 位置验证失败', {
          currentLocation: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          companyLocation: COMPANY_LOCATION,
          time: new Date().toLocaleString(),
          userId: this.data.userId
        });

        // 计算实际距离并显示
        const distance = getDistance(
          location.latitude,
          location.longitude,
          COMPANY_LOCATION.latitude,
          COMPANY_LOCATION.longitude
        );

        wx.showToast({
          title: `距离公司${Math.round(distance)}米，请在公司范围内打卡`,
          icon: 'none',
          duration: 3000
        });
        return;
      }

      const db = wx.cloud.database();
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date();

      // 查找今日记录
      const todayRecord = await db.collection('attendance_records')
        .where({
          userId: this.data.userId,
          date: today
        })
        .get();

      if (todayRecord.data.length === 0) {
        // 创建新记录
        await db.collection('attendance_records').add({
          data: {
            userId: this.data.userId,
            userName: this.data.userName,
            date: today,
            clockInTime: currentTime,
            clockInLocation: location,
            createTime: db.serverDate()
          }
        });
      } else {
        // 更新最早的上班时间
        const record = todayRecord.data[0];
        if (!record.clockInTime || currentTime < record.clockInTime) {
          await db.collection('attendance_records')
            .doc(record._id)
            .update({
              data: {
                clockInTime: currentTime,
                clockInLocation: location
              }
            });
        }
      }

      await this.getTodayRecord(); // 刷新显示
      wx.showToast({
        title: '上班打卡成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('上班打卡失败:', error);
      console.error('错误详情:', {
        userId: this.data.userId,
        userName: this.data.userName,
        time: new Date().toLocaleString(),
        errorMessage: error.message,
        errorStack: error.stack,
        location: error.location || '未获取到位置信息'
      });
      wx.showToast({
        title: '打卡失败',
        icon: 'none'
      });
    }
  },

  async handleClockOut() {
    try {
      // 获取位置信息
      const location = await wx.getLocation({
        type: 'gcj02'
      });
      
      // 验证位置
      if (!isValidLocation(location)) {
        console.error('下班打卡失败: 位置验证失败', {
          location,
          time: new Date().toLocaleString(),
          userId: this.data.userId
        });
        wx.showToast({
          title: '请在公司范围内打卡',
          icon: 'none'
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      let record = await findTodayRecord(this.data.userId, today);
      
      if (!record) {
        console.error('下班打卡失败: 未找到上班打卡记录', {
          userId: this.data.userId,
          date: today,
          time: new Date().toLocaleString()
        });
        wx.showToast({
          title: '请先进行上班打卡',
          icon: 'none'
        });
        return;
      }

      const currentTime = new Date();
      if (!record.clockOutTime || currentTime > record.clockOutTime) {
        record.clockOutTime = currentTime;
        await updateRecord(record);
        await this.getTodayRecord(); // 刷新显示
        
        wx.showToast({
          title: '下班打卡成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('下班打卡失败:', error);
      console.error('错误详情:', {
        userId: this.data.userId,
        time: new Date().toLocaleString(),
        errorMessage: error.message,
        errorStack: error.stack,
        location: error.location || '未获取到位置信息'
      });
      wx.showToast({
        title: '打卡失败',
        icon: 'none'
      });
    }
  }
}); 