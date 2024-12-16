const { clockReminder, cancelClockReminder, checkClockReminder } = require('../../utils/reminder.js');

Page({
    data: {
      userInfo: null,
      totalDays: 0,
      totalHours: 0,
      averageHours: 0,
      hasUserInfo: false,
      hasReminder: false
    },
  
    onLoad() {
      this.getUserInfo();
      this.getAttendanceStats();
      this.setData({
        hasReminder: checkClockReminder()
      });
    },
  
    // 获取用户信息
    getUserInfo() {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({ userInfo });
      } else {
        // 如果没有用户信息，提示用户登录
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false
        });
      }
    },
  
    // 获取考勤统计
    async getAttendanceStats() {
      try {
        const db = wx.cloud.database();
        const _ = db.command;
        const res = await db.collection('attendance_records')
          .where({
            _openid: this.data.userInfo?._openid
          })
          .get();
  
        if (res.data.length > 0) {
          let totalMinutes = 0;
          const records = res.data;
  
          records.forEach(record => {
            if (record.clockInTime && record.clockOutTime) {
              totalMinutes += (record.clockOutTime - record.clockInTime) / (1000 * 60);
            }
          });
  
          this.setData({
            totalDays: records.length,
            totalHours: (totalMinutes / 60).toFixed(1),
            averageHours: (totalMinutes / 60 / records.length).toFixed(1)
          });
        }
      } catch (error) {
        console.error('获取统计数据失败：', error);
      }
    },
  
    // 登录
    handleLogin() {
      wx.showLoading({
        title: '登录中...',
      });

      wx.getUserProfile({
        desc: '用于完善会员资料',
        success: (res) => {
          const userInfo = res.userInfo;
          console.log('获取到的用户信息：', userInfo);

          // 调用云函数
          wx.cloud.callFunction({
            name: 'login',
            data: {},
            success: result => {
              console.log('云函数调用成功：', result);
              userInfo._openid = result.result.openid;
              
              // 保存用户信息
              wx.setStorageSync('userInfo', userInfo);
              this.setData({
                userInfo: userInfo,
                hasUserInfo: true
              });
              
              wx.hideLoading();
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
            },
            fail: err => {
              console.error('云函数调用失败：', err);
              wx.hideLoading();
              wx.showModal({
                title: '登录失败',
                content: '获取用户ID失败，错误信息：' + JSON.stringify(err),
                showCancel: false
              });
            }
          });
        },
        fail: (err) => {
          console.error('获取用户信息失败：', err);
          wx.hideLoading();
          wx.showModal({
            title: '登录失败',
            content: '获取用户信息失败，请重试',
            showCancel: false
          });
        }
      });
    },
  
    // 退出登录
    handleLogout() {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('userInfo');
            this.setData({ 
              userInfo: null,
              hasUserInfo: false
            });
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            });
          }
        }
      });
    },
  
    // 处理提醒开关变化
    async handleReminderChange(e) {
      const { value } = e.detail;
      if (value) {
        // 设置提醒
        const success = await setClockReminder('09:00');
        this.setData({
          hasReminder: success
        });
      } else {
        // 取消提醒
        const success = cancelClockReminder();
        this.setData({
          hasReminder: !success
        });
      }
    }
  });