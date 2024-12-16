Page({
    data: {
      weeklyStats: null,
      monthlyStats: null,
      currentWeek: '',
      currentMonth: '',
      tabActive: 'week'  // 'week' 或 'month'
    },
  
    onShow() {
      this.setCurrentPeriod();
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
  
    // 获取本周日期范围
    getWeekRange() {
      const now = new Date();
      const currentDay = now.getDay(); // 0是周日，1是周一
      const monday = new Date(now); // 本周一
      monday.setDate(now.getDate() - (currentDay || 7) + 1);
      monday.setHours(0, 0, 0, 0);
  
      const sunday = new Date(monday); // 本周日
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
  
      return {
        weekStart: monday,
        weekEnd: sunday
      };
    },
  
    // 获取本月日期范围
    getMonthRange() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
  
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
  
      return {
        monthStart,
        monthEnd
      };
    },
  
    // 获取统计数据
    async fetchStatistics() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        if (!userInfo || !userInfo._openid) {
          return;
        }
  
        if (this.data.tabActive === 'week') {
          await this.fetchWeeklyStats(userInfo._openid);
        } else {
          await this.fetchMonthlyStats(userInfo._openid);
        }
      } catch (error) {
        console.error('获取统计数据失败：', error);
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }
    },
  
    // 获取周统计
    async fetchWeeklyStats(openid) {
      const db = wx.cloud.database();
      const _ = db.command;
      const { weekStart, weekEnd } = this.getWeekRange();
  
      const records = await db.collection('attendance_records')
        .where({
          _openid: openid,
          clockInTime: _.gte(weekStart.getTime()).and(_.lte(weekEnd.getTime()))
        })
        .get();
  
      const stats = this.calculateStats(records.data);
      this.setData({ weeklyStats: stats });
    },
  
    // 获取月统计
    async fetchMonthlyStats(openid) {
      const db = wx.cloud.database();
      const _ = db.command;
      const { monthStart, monthEnd } = this.getMonthRange();
  
      const records = await db.collection('attendance_records')
        .where({
          _openid: openid,
          clockInTime: _.gte(monthStart.getTime()).and(_.lte(monthEnd.getTime()))
        })
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
          if (clockOutHour >= 22) {
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
    }
  });