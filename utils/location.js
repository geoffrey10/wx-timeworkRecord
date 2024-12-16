// 公司位置配置
const COMPANY_LOCATION = {
  latitude: 39.914,  // 公司纬度
  longitude: 116.46323,  // 公司经度
  radius: 5000  // 打卡范围半径（米）
};

// 计算两点之间的距离
function getDistance(lat1, lon1, lat2, lon2) {
  // 转换为数字类型
  lat1 = Number(lat1);
  lon1 = Number(lon1);
  lat2 = Number(lat2);
  lon2 = Number(lon2);

  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  console.log('距离计算详情：', {
    起点: { 纬度: lat1, 经度: lon1 },
    终点: { 纬度: lat2, 经度: lon2 },
    弧度差: { 纬度: dLat, 经度: dLon },
    计算结果: {
      a: a,
      c: c,
      distance: distance.toFixed(2) + '米'
    }
  });

  return distance;
}

// 验证位置是否在允许范围内
function isValidLocation(location) {
  if (!location || !location.latitude || !location.longitude) {
    console.error('位置信息不完整:', location);
    return false;
  }

  const distance = getDistance(
    location.latitude,
    location.longitude,
    COMPANY_LOCATION.latitude,
    COMPANY_LOCATION.longitude
  );

  const isValid = !isNaN(distance) && distance <= COMPANY_LOCATION.radius;

  console.log('位置验证详情：', {
    当前位置: {
      纬度: location.latitude,
      经度: location.longitude
    },
    公司位置: {
      纬度: COMPANY_LOCATION.latitude,
      经度: COMPANY_LOCATION.longitude
    },
    实际距离: isNaN(distance) ? 'NaN米' : distance.toFixed(2) + '米',
    允许范围: COMPANY_LOCATION.radius + '米',
    是否在范围内: isValid ? '是' : '否'
  });

  return isValid;
}

module.exports = {
  isValidLocation,
  COMPANY_LOCATION
}; 