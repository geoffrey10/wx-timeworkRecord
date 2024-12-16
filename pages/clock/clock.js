const { isValidLocation, COMPANY_LOCATION } = require('../../utils/location.js');
const { clockReminder } = require('../../utils/reminder.js');
Page({
  data: {
    currentTime: '',
    currentDate: '',
    userInfo: null,
    isLogin: false,
    todayRecord: null  // 添加今日打卡记录
  },

  onLoad() {
    this.checkLoginStatus();
    this.updateTime();
    setInterval(() => {
      this.updateTime();
    }, 1000);
  },

  onShow() {
    this.checkLoginStatus();
    if (this.data.isLogin) {
      this.getTodayRecord();  // 获取今日打卡记录
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('当前用户信息：', userInfo);
    
    if (userInfo && userInfo._openid) {
      this.setData({
        userInfo: userInfo,
        isLogin: true
      });
    } else {
      this.setData({
        userInfo: null,
        isLogin: false
      });
    }
  },

  updateTime() {
    const now = new Date();
    this.setData({
      currentTime: now.toLocaleTimeString('zh-CN'),
      currentDate: now.toLocaleDateString('zh-CN')
    });
  },

  // 获取今日打卡记录
  async getTodayRecord() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const today = new Date().toLocaleDateString('zh-CN');
      
      const res = await db.collection('attendance_records')
        .where({
          _openid: this.data.userInfo._openid,
          date: today
        })
        .get();

      if (res.data.length > 0) {
        const record = res.data[0];
        let earliestClockIn = record.clockInTime;
        let latestClockOut = record.clockOutTime;

        // 如果有多条记录，找出最早的上班时间和最晚的下班时间
        if (res.data.length > 1) {
          res.data.forEach(item => {
            if (item.clockInTime && (!earliestClockIn || item.clockInTime < earliestClockIn)) {
              earliestClockIn = item.clockInTime;
            }
            if (item.clockOutTime && (!latestClockOut || item.clockOutTime > latestClockOut)) {
              latestClockOut = item.clockOutTime;
            }
          });
        }

        // 格式化时间
        const clockInTime = earliestClockIn ? new Date(earliestClockIn).toLocaleTimeString('zh-CN') : '';
        const clockOutTime = latestClockOut ? new Date(latestClockOut).toLocaleTimeString('zh-CN') : '';
        
        this.setData({
          todayRecord: {
            ...record,
            clockInTimeFormat: clockInTime,
            clockOutTimeFormat: clockOutTime,
            clockInTime: earliestClockIn,
            clockOutTime: latestClockOut
          }
        });

        console.log('今日打卡记录：', {
          上班时间: clockInTime,
          下班时间: clockOutTime
        });
      } else {
        this.setData({
          todayRecord: null
        });
      }
    } catch (error) {
      console.error('获取今日打卡记录失败：', error);
    }
  },

  // 上班打卡
  async handleClockIn() {
    try {
      // 严格检查登录状态
      if (!this.data.isLogin || !this.data.userInfo || !this.data.userInfo._openid) {
        console.log('未登录状态，不能打卡');
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 2000
        });
        
        // 可以选择跳转到登录页面
        wx.switchTab({
          url: '/pages/profile/profile'
        });
        return;
      }

      // 获取位置信息
      const location = await wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 3000
      });

      // 验证位置
      if (!isValidLocation(location)) {
        wx.showToast({
          title: '请在公司范围内打卡',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      const db = wx.cloud.database();
      const timestamp = Date.now();
      const today = new Date().toLocaleDateString('zh-CN');

      // 查询今日记录
      const todayRecord = await db.collection('attendance_records')
        .where({
          _openid: this.data.userInfo._openid,  // 使用当前登录用户的openid
          date: today
        })
        .get();

      if (todayRecord.data.length === 0) {
        // 创建新记录
        await db.collection('attendance_records').add({
          data: {
            date: today,
            clockInTime: timestamp,
            clockInLocation: location,
            userName: this.data.userInfo.nickName,  // 添加用户名
            createTime: db.serverDate()
          }
        });
      } else {
        // 如果新的打卡时间更早，则更新
        const earliestClockIn = Math.min(timestamp, todayRecord.data[0].clockInTime || Infinity);
        await db.collection('attendance_records')
          .doc(todayRecord.data[0]._id)
          .update({
            data: {
              clockInTime: earliestClockIn,
              clockInLocation: location
            }
          });
      }

      wx.showToast({
        title: '打卡成功',
        icon: 'success'
      });

      // 立即刷新显示的打卡记录
      this.getTodayRecord();

    } catch (error) {
      console.error('上班打卡失败：', error);
      wx.showToast({
        title: '打卡失败',
        icon: 'none'
      });
    }
  },

  async handleClockOut() {
    try {
      // 检查登录状态
      if (!this.data.isLogin || !this.data.userInfo || !this.data.userInfo._openid) {
        wx.showModal({
          title: '提示',
          content: '请先登录后再打卡',
          showCancel: false,
          success: (res) => {
            if (res.confirm) {
              this.goToLogin();
            }
          }
        });
        return;
      }
  
      const db = wx.cloud.database();
      const today = new Date().toLocaleDateString('zh-CN');
      const timestamp = Date.now();
  
      // 先查询今日是否有上班打卡记录
      const todayRecord = await db.collection('attendance_records')
        .where({
          _openid: this.data.userInfo._openid,
          date: today,
          clockInTime: db.command.exists(true)  // 确保有上班打卡时间
        })
        .get();
  
      // 如果没有上班打卡记录
      if (todayRecord.data.length === 0) {
        wx.showModal({
          title: '提示',
          content: '请先进行上班打卡',
          showCancel: false
        });
        return;
      }
  
      // 获取位置
      const location = await wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 3000
      });
  
      // 验证位置
      if (!isValidLocation(location)) {
        wx.showToast({
          title: '请在公司范围内打卡',
          icon: 'none',
          duration: 2000
        });
        return;
      }
        // 如果新的打卡时间更晚，则更新
        const latestClockOut = Math.max(timestamp, todayRecord.data[0].clockOutTime || 0);

      // 更新下班打卡记录
      await db.collection('attendance_records')
        .doc(todayRecord.data[0]._id)
        .update({
          data: {
            clockOutTime: latestClockOut,
            clockOutLocation: location
          }
        });
  
      wx.showToast({
        title: '下班打卡成功',
        icon: 'success'
      });
  
      // 立即刷新显示的打卡记录
      this.getTodayRecord();
  
    } catch (error) {
      console.error('下班打卡失败：', error);
      wx.showToast({
        title: error.message || '下班打卡失败',
        icon: 'none'
      });
    }
  }
}); 