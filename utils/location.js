// 公司位置配置
const COMPANY_LOCATION = {
  latitude: 39.9140, // 需要替换为实际公司纬度
  longitude: 116.46323, // 需要替换为实际公司经度
  radius: 5000 // 允许的范围半径（米），可以根据需要调整
};

// 验证位置是否在允许范围内
function isValidLocation(location) {
  const distance = getDistance(
    location.latitude,
    location.longitude,
    COMPANY_LOCATION.latitude,
    COMPANY_LOCATION.longitude
  );

  console.log('位置验证详情：', {
    当前位置: {
      纬度: location.latitude,
      经度: location.longitude
    },
    公司位置: {
      纬度: COMPANY_LOCATION.latitude,
      经度: COMPANY_LOCATION.longitude
    },
    实际距离: Math.round(distance) + '米',
    允许范围: COMPANY_LOCATION.radius + '米',
    是否在范围内: distance <= COMPANY_LOCATION.radius ? '是' : '否'
  });

  return distance <= COMPANY_LOCATION.radius;
}

// 计算两点之间的距离（米）
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

module.exports = {
  isValidLocation,
  COMPANY_LOCATION
}; 