Page({
    data: {
      userInfo: null,
      totalDays: 0,
      totalHours: 0,
      averageHours: 0,
      hasUserInfo: false
    },
  
    onLoad() {
      this.getUserInfo();
      this.getAttendanceStats();
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
      wx.getUserProfile({
        desc: '用于完善会员资料',
        success: (res) => {
          const userInfo = res.userInfo;
          // 获取openid
          wx.cloud.callFunction({
            name: 'login',
            success: result => {
              userInfo._openid = result.result.openid;
              // 保存用户信息
              wx.setStorageSync('userInfo', userInfo);
              this.setData({
                userInfo: userInfo,
                hasUserInfo: true
              });
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
            },
            fail: err => {
              console.error('获取openid失败：', err);
              wx.showToast({
                title: '登录失败',
                icon: 'none'
              });
            }
          });
        },
        fail: (err) => {
          console.error('获取用户信息失败：', err);
          wx.showToast({
            title: '登录失败',
            icon: 'none'
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
    }
  });