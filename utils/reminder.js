// 设置打卡提醒
const clockReminder = async (time) => {
  try {
    // 获取用户授权
    const setting = await wx.getSetting();
    if (!setting.authSetting['scope.userInfo']) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return false;
    }

    // 请求订阅消息权限
    const result = await wx.requestSubscribeMessage({
      tmplIds: ['这里填写您的模板ID'], // 需要在微信公众平台申请模板ID
    });

    if (result.errMsg === 'requestSubscribeMessage:ok') {
      // 保存提醒设置
      wx.setStorageSync('clockReminder', {
        enabled: true,
        time: time || '09:00'
      });
      
      wx.showToast({
        title: '提醒设置成功',
        icon: 'success'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('设置提醒失败：', error);
    wx.showToast({
      title: '设置失败',
      icon: 'none'
    });
    return false;
  }
};

// 取消打卡提醒
const cancelClockReminder = () => {
  try {
    wx.removeStorageSync('clockReminder');
    wx.showToast({
      title: '已取消提醒',
      icon: 'success'
    });
    return true;
  } catch (error) {
    console.error('取消提醒失败：', error);
    return false;
  }
};

// 检查是否已设置提醒
const checkClockReminder = () => {
  try {
    const reminder = wx.getStorageSync('clockReminder');
    return reminder && reminder.enabled;
  } catch (error) {
    console.error('检查提醒设置失败：', error);
    return false;
  }
};

module.exports = {
  clockReminder,
  cancelClockReminder,
  checkClockReminder
}; 