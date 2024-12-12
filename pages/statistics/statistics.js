Page({
    data: {
      weeklyStats: null,
      monthlyStats: null,
      currentWeek: '',
      currentMonth: '',
      tabActive: 'week'  // 'week' 或 'month'
    },
  
    onLoad() {
      this.setCurrentPeriod();
    },
  
    onShow() {
      this.fetchStatistics();
    },
  
    // 设置当前周期
    setCurrentPeriod() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const weekNumber = this.getWeekNumber(now);
      
      this.setData({
        currentWeek: `${year}年第${weekNumber}周`,
        currentMonth: `${year}年${month}月`
      });
    },
  
    // 获取周数
    getWeekNumber(date) {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDays = (date - firstDayOfYear) / 86400000;
      return Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
    },
  
    // 切换统计周期
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ tabActive: tab });
      this.fetchStatistics();
    },
  
    // 获取统计数据
    async fetchStatistics() {
      try {
        if (this.data.tabActive === 'week') {
          await this.fetchWeeklyStats();
        } else {
          await this.fetchMonthlyStats();
        }
      } catch (error) {
        console.error('获取统计数据失败：', error);
        wx.showToast({
          title: '获取数据失败',
          icon: 'error'
        });
      }
    },
  
    // 获取周统计
    async fetchWeeklyStats() {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取本周的起止时间
      const { weekStart, weekEnd } = this.getWeekRange();
  
      const records = await db.collection('attendance_records')
        .where({
          _openid: getApp().globalData.userInfo._openid,
          date: _.gte(weekStart).and(_.lte(weekEnd))
        })
        .orderBy('date', 'asc')
        .get();
  
      const stats = this.calculateStats(records.data);
      this.setData({ weeklyStats: stats });
    },
  
    // 获取月统计
    async fetchMonthlyStats() {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取本月的起止时间
      const { monthStart, monthEnd } = this.getMonthRange();
  
      const records = await db.collection('attendance_records')
        .where({
          _openid: getApp().globalData.userInfo._openid,
          date: _.gte(monthStart).and(_.lte(monthEnd))
        })
        .orderBy('date', 'asc')
        .get();
  
      const stats = this.calculateStats(records.data);
      this.setData({ monthlyStats: stats });
    },
  
    // 计算统计数据
    calculateStats(records) {
      let totalWorkingMinutes = 0;
      let daysWorked = 0;
      let earlyDays = 0;
      let lateDays = 0;
      const standardWorkDay = 8 * 60; // 8小时 = 480分钟
  
      records.forEach(record => {
        if (record.clockInTime && record.clockOutTime) {
          const workingMinutes = Math.floor((record.clockOutTime - record.clockInTime) / (1000 * 60));
          totalWorkingMinutes += workingMinutes;
          daysWorked++;
  
          // 早到（早于9点）
          const clockInHour = new Date(record.clockInTime).getHours();
          const clockInMinute = new Date(record.clockInTime).getMinutes();
          if (clockInHour < 9 || (clockInHour === 9 && clockInMinute === 0)) {
            earlyDays++;
          }
  
          // 晚退（晚于18点）
          const clockOutHour = new Date(record.clockOutTime).getHours();
          if (clockOutHour >= 18) {
            lateDays++;
          }
        }
      });
  
      const averageWorkingHours = daysWorked ? (totalWorkingMinutes / daysWorked / 60).toFixed(1) : 0;
      const overtimeHours = Math.max(0, totalWorkingMinutes - (daysWorked * standardWorkDay)) / 60;
  
      return {
        daysWorked,
        averageWorkingHours,
        totalWorkingHours: (totalWorkingMinutes / 60).toFixed(1),
        overtimeHours: overtimeHours.toFixed(1),
        earlyDays,
        lateDays
      };
    },
  
    // 获取本周日期范围
    getWeekRange() {
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toLocaleDateString('zh-CN');
      const weekEnd = new Date(now.setDate(now.getDate() + 6)).toLocaleDateString('zh-CN');
      return { weekStart, weekEnd };
    },
  
    // 获取本月日期范围
    getMonthRange() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('zh-CN');
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('zh-CN');
      return { monthStart, monthEnd };
    }
  });