function createProduct(data) {
  let order = data.order
  let personalMeasureBodyStyle = data.personalMeasureBodyStyle
  const orderSerialNum = order.code.split(".")[1]
  const orderId = order.数据ID
  let result = []
  const length = personalMeasureBodyStyle.length
  for (let i = 0; i < length; i++) {
    let card = personalMeasureBodyStyle[i]
    let num = card.number
    let arr = new Array(num)
    for (let j = 0; j < num; j++) {
      arr[j] = {
        personalMeasureBodyId: card.personalMeasureBodyId,
        personalMeasureBodyStyleId: card.数据ID,
        measureBodyId: card.measureBodyId,
        orderId,
        styleId: card.styleId,
        styleOrigin: card.styleOrigin,
        description: card.description,
        importSentinal: card.importSentinal,
        standard: card.standard,
        size: card.size,
        change: card.change
      }
    }
    result = result.concat(arr)
  }
  result = result.map((item, index) => {
    item.uuid = "P." + orderSerialNum + "." + (index + 1 + "").padStart(3, "0");
    return item
  })
  return { result }
}
module.exports = createProduct