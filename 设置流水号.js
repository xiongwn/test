//console.log(userProduct,userMaterialUsage,systemMaterialUsage,systemProduct)
let bedList = Array.from(new Set(userProduct.concat(systemProduct).map(i => i.bedId)))
let serialNum = Math.min(...userProduct.map(e => e.serialNum), ...systemProduct.map(e => e.serialNum)) - 1
let newBedId = 1
let newRowId = 1
for (let n = 0; n < bedList.length; n++) {
  const currentBedId = bedList[n]
  // 符合原有床号的usage
  let usageArr = systemMaterialUsage.filter(i => i.bedId === currentBedId)
  usageArr.forEach(e => {
    e.c_product = systemProduct.filter(i => e.uuids.includes(i.uuid))
  	e.minRowId = e.c_product.map(i => i.rowId).sort((pre, next) => pre - next)[0]
	})
  usageArr.sort((pre, next) => pre.minRowId - next.minRowId)
  for (let k = 0; k < usageArr.length; k++) {
    usageArr[k].newBedId = newBedId
    let c_product = usageArr[k].c_product
    // 该usage下有哪些列
    let rowArr = Array.from(new Set(c_product.map(i => i.rowId))).sort((pre, next) => pre - next)
    for (let j = 0; j < rowArr.length; j++) {
      let r_product = c_product.filter(i => i.rowId === rowArr[j])
      r_product.forEach(e => {
        e.serialNum = ++serialNum
        e.newRowId = newRowId
        e.newBedId = newBedId
      })
      newRowId++
    }
  }
  newBedId++
}
// ---------------------------------------
bedList = Array.from(new Set(systemProduct.concat(userProduct).map(i => i.bedId)))
for (let n = 0; n < bedList.length; n++) {
  const currentBedId = bedList[n]
  // 符合原有床号的usage
  let usageArr = userMaterialUsage.filter(i => i.bedId === currentBedId)
  usageArr.forEach(e => {
    e.c_product = userProduct.filter(i => e.uuids.includes(i.uuid))
  	e.minRowId = e.c_product.map(i => i.rowId).sort((pre, next) => pre - next)[0]
	})
  usageArr.sort((pre, next) => pre.minRowId - next.minRowId)
  for (let k = 0; k < usageArr.length; k++) {
    usageArr[k].newBedId = newBedId
    // console.log("usageArr[k]", usageArr[k])
    let c_product = usageArr[k].c_product
    let sizeDetail = usageArr[k].sizeDetail
    // 该usage下有哪些列
    let rowArr = Array.from(new Set(c_product.map(i => i.rowId))).sort((pre, next) => pre - next)
    for (let j = 0; j < rowArr.length; j++) {
      sizeDetail.filter(i => i.rowId === rowArr[j]).forEach(e => {
        e.rowId = newRowId
      })
      let r_product = c_product.filter(i => i.rowId === rowArr[j])
      r_product.forEach(e => {
        e.serialNum = ++serialNum
        e.newRowId = newRowId
        e.newBedId = newBedId
      })
      newRowId++
    }
  }
  // console.log("usageArr", usageArr, userMaterialUsage)
  newBedId++
}

let product = systemProduct.concat(userProduct)
let materialUsage = userMaterialUsage.concat(systemMaterialUsage)
product.forEach(e => {
  e.rowId = e.newRowId
  e.bedId = e.newBedId
})
materialUsage.forEach(e => {
  e.bedId = e.newBedId
})
//console.log({product, materialUsage})
return {product, materialUsage}