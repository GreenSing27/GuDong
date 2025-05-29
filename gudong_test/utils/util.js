const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 计算饮水进度
const calculateProgress = (current, target) => {
  if (!target) return 0
  const progress = (current / target) * 100
  return progress > 100 ? 100 : progress
}

// 格式化饮水量
const formatWaterAmount = amount => {
  return amount >= 1000 ? `${(amount / 1000).toFixed(1)}L` : `${amount}ml`
}

module.exports = {
  formatTime,
  formatNumber,
  calculateProgress,
  formatWaterAmount
} 