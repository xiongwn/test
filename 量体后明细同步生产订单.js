// 该功能不适用于售后订单
let list

// 处理一下量体后明细，避免字段被污染
afterSaleMeasureBodyDetail.forEach(i => {
  delete i.status
  delete i.code
})

productionOrder = productionOrder.map(i => {if(!i.afterMeasureBodyDetailIds) {i.afterMeasureBodyDetailIds = []}; return i})
// 原先measureBody不存在的订单
let changedProduction = []
let length = productionOrder.length
const currentAfterSaleMeasureBodyDetail = afterSaleMeasureBodyDetail.map(item => item.数据ID)
for (let i = 0; i < length; i++) {
  if (!currentAfterSaleMeasureBodyDetail.includes(productionOrder[0]["afterMeasureBodyDetailIds"][0])) {
    changedProduction.push(productionOrder[i])
  }
}

// 无拆单直接同步
if (changedProduction.length === 0) {
  list = productionOrder.map(item => {let measureBody = afterSaleMeasureBodyDetail.find(sub => sub.数据ID === item.afterMeasureBodyDetailIds[0]); delete measureBody.数据ID; return Object.assign(item, measureBody)})
  list.forEach(i => {
    i.status = 2
    i.scheduleStatus = 0
  })
  return {list}
}

// 有拆单
// 旧生产订单对应的明细行ids
let oldMeasureBodyIds = productionOrder.map(item => item.afterMeasureBodyDetailIds[0])
let newMeasureBody = afterSaleMeasureBodyDetail.filter(item => !oldMeasureBodyIds.includes(item.数据ID))
length = newMeasureBody.length
for (let i; i < length; i++) {
  // 判断变更后的明细行投放类型是否能正常继承，如果有冲突则报错：APS生产订单投放类型与FRP明细行有冲突，无法重新排程
  // 明细行itemDetail的uuid在生产订单里的dept_id和deliverType是否一致
  // 新明细行的uuids
  let measure_body_uuids = newMeasureBody[i].itemDetail
  // 新明细行的uuids对应的老订单
  let old_production_order_list = productionOrder.filter(item => item.itemDetail.some(sub => measure_body_uuids.includes(sub)))
  const sameDept = new Set(old_production_order_list.map(item => item.dept_id)).size === 1
  const sameDeliverType = new Set(old_production_order_list.map(item => item.deliverType)).size === 1
  // 有一个不相等就报错
  if (!sameDept || !sameDeliverType) {
    return {code: "production_order_param_err", reason: "APS生产订单投放类型与FRP明细行有冲突，无法重新排程"}
  }
}

// 没有冲突
let oldProductionOrderList = productionOrder.filter(item => !changedProduction.map(sub => sub.数据ID).includes(item.数据ID))
let productionOrderIndex = 1
// console.log("productionOrder[0].code", productionOrder[0].code)
const productionOrderCodeStr = productionOrder[0].code.split(".").slice(0, 2).join(".")
// console.log("oldProductionOrderList", oldProductionOrderList)
if (oldProductionOrderList.length > 0) {
    productionOrderIndex = oldProductionOrderList.map(item => item.code.split(".")[2] - 0).sort((pre, next) => next - pre)[0] + 1
}
// 没有变动的旧数据只更新
oldProductionOrderList = oldProductionOrderList.map(item => {let measureBody = afterSaleMeasureBodyDetail.find(sub => sub.数据ID === item.afterMeasureBodyDetailIds[0]); delete measureBody.数据ID; return Object.assign(item, measureBody)})
// 新订单
let newProductOrderList = newMeasureBody.map((item, index) => {
    item.afterMeasureBodyDetailIds = [item.数据ID]
    item.code = productionOrderCodeStr + "." + (productionOrderIndex + index).toString().padStart(2,"0")
    item.totalNum = item.itemNum
    delete item.数据ID
    return item
})

const result = oldProductionOrderList.concat(newProductOrderList).map(i => {
  i.scheduleStatus = 0
  i.status = 2
  return i
})

return {list: result, removeList: changedProduction}