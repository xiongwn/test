function a(factories, productionOrders, styles, products, inventoryData) {
// function a() {
    let confirmedProductionOrders = []
    let confirmedProducts = []
    inventoryData = inventoryData.filter(i => i.FCanDivBatches && i.FColorDiffRange)
    // 合并库存，厂区-编码-色差档
    inventoryData.forEach(item => {
        item.groupKey = `${item.FMaterialNumber}-${item.FOrgNumber}-${item.FColorDiffRange}`
    })
    let setArr = Array.from(new Set(inventoryData.map(i => i.groupKey)))
    let inventoryList = setArr.map(i => {
        let arr = inventoryData.filter(sub => sub.groupKey === i)
        let FCanDivBatches = arr.reduce((pre, next) => (pre + next.FCanDivBatches).toFixed(4) - 0, 0)
        let obj = arr[0]
        obj.FCanDivBatches = FCanDivBatches
        return obj
    })
    // console.log("inventoryList", JSON.parse(JSON.stringify(inventoryList)))
    // 合并生产订单，交期-主面料-合同
    productionOrders.forEach(item => {
        let style = styles.find(i => item.styleCode === i.code)
        let mainMaterial = (style.amountList || []).find(i => i.code === style.main)
        item.main = style.main
        item.materialAmount = mainMaterial.amount
        item.factoryCode = factories.find(i => i.id == item.dept_id).code
        item.totalAmount = ((item.totalNum - item.reserveNum) * mainMaterial.amount).toFixed(4) - 0
        item.groupKey = `${item.deliveryDate}-${item.main}-${item.orderId}`
    })
    let groupList = Array.from(new Set(productionOrders.map(i => i.groupKey)))
    // 按组做处理
    // console.log("groupList", groupList)
    for (let k = 0; k < groupList.length; k++) {
        const cacheInventoryList = JSON.parse(JSON.stringify(inventoryList))
        let groupKey = groupList[k]
        let productionOrderList_c = productionOrders.filter(i => i.groupKey === groupKey).sort((pre, next) => pre.deliveryDate - next.deliveryDate)
        let main = productionOrderList_c[0].main
        // console.log("productionOrderList_c", productionOrderList_c)

        let unable = false
        for (let j = 0; j < productionOrderList_c.length; j++) {

            let currentProductionOrder = productionOrderList_c[j]
            const factoryCode = currentProductionOrder.factoryCode
            // 
            let currentInventory = inventoryList.filter(i => i.FMaterialNumber == main.replace(/\./g, "") && i.FOrgNumber == factoryCode).sort((pre, next) => pre.FCanDivBatches - next.FCanDivBatches)
            if (currentProductionOrder.totalAmount > currentInventory.reduce((pre, next) => pre + next.FCanDivBatches, 0)) {
                // console.log("currentProductionOrder.totalAmount", currentProductionOrder.totalAmount, currentProductionOrder)
                // console.log("currentInventory", JSON.parse(JSON.stringify(currentInventory)))
                // console.log("inventoryList", JSON.parse(JSON.stringify(inventoryList)))
                unable = true
                break
            }
            const cacheInventoryList_1 = JSON.parse(JSON.stringify(inventoryList))
            let product_c = products.filter(i => currentProductionOrder.itemDetail.some(sub => sub === i.uuid))
            product_c.forEach(item => {
                item.materialAmount = currentProductionOrder.materialAmount
            })
            function handleProductColorDiff(productList, groupType) {
                const materialAmount = productList[0].materialAmount
                let group
                if (groupType === "dept") {
                    group = Array.from(new Set(productList.map(i => i.departmentId))).map(i => productList.filter(sub => sub.departmentId === i))
                } else if (groupType === "dept_sex") {
                    group = Array.from(new Set(productList.map(i => `${i.departmentId}-${i.sex}`))).map(i => productList.filter(sub => `${sub.departmentId}-${sub.sex}` === i))
                } else if (groupType === "memberId") {
                    group = Array.from(new Set(productList.map(i => i.memberId))).map(i => productList.filter(sub => sub.memberId === i))
                }
                // 把衣服分组，数量又少到多
                group.sort((pre, next) => pre.length - next.length)
                currentInventory = inventoryList.filter(i => i.FMaterialNumber == main.replace(/\./g, "") && i.FOrgNumber == factoryCode).sort((pre, next) => pre.FCanDivBatches - next.FCanDivBatches)
                // 键是色差档，值是数量
                // console.log("currentInventory", JSON.parse(JSON.stringify(currentInventory)))
                let colorDiffAmountMap = currentInventory.reduce((pre, next) => {
                    if (pre[next.FColorDiffRange]) {
                        pre[next.FColorDiffRange] = (next.FCanDivBatches + pre[next.FColorDiffRange]).toFixed(10) - 0
                    } else {
                        pre[next.FColorDiffRange] = next.FCanDivBatches
                    }
                    // console.log("next", next)
                    return pre
                }, {})
                // console.log("colorDiffAmountMap", colorDiffAmountMap)
                // 最多相同色差档如果没有能大于数量最多分组的，表示不能排，直接退出
                if (!Object.values(colorDiffAmountMap).some(i => i >= (group.slice(-1)[0].length * materialAmount).toFixed(4) - 0)) {
                    return false
                }
                // 开始分批
                // console.log("group", group)
                for (let currentGroup of group) {
                    // console.log("currentGroup", currentGroup)
                    // 当前分组所需用量
                    let requirementAmount = currentGroup.length * materialAmount
                    let entries = Object.entries(colorDiffAmountMap).sort((pre, next) => pre[1] - next[1])
                    // console.log("entries",entries, colorDiffAmountMap)
                    const colorDiff = entries.find(i => i[1] >= requirementAmount)
                    // 相同色差档如果没有能大于数当前分组的，表示不能排，直接退出
                    if (!colorDiff) {
                        inventoryList = JSON.parse(JSON.stringify(cacheInventoryList_1))
                        return false
                    }
                    // console.log("colorDiff", colorDiff)
                    colorDiffAmountMap[colorDiff[0]] = (colorDiffAmountMap[colorDiff[0]] - requirementAmount).toFixed(4) - 0
                    // console.log("colorDiffAmountMap", colorDiffAmountMap)
                    while (requirementAmount > 0) {
                        let obj = currentInventory.find(i => i.FCanDivBatches > 0)
                        // console.log("obj-start", obj)
                        if (obj.FCanDivBatches >= requirementAmount) {
                            obj.FCanDivBatches = (obj.FCanDivBatches - requirementAmount).toFixed(10) - 0
                            requirementAmount = 0
                        } else {
                            requirementAmount = (requirementAmount - obj.FCanDivBatches).toFixed(10) - 0
                            obj.FCanDivBatches = 0
                        }
                        // console.log("obj-end", obj)
                    }
                    // console.log("currentGroup", currentGroup)
                    currentGroup.forEach(item => {
                        item.colorDiff = colorDiff[0]
                    })
                }
                return true
            }
            unable = !handleProductColorDiff(product_c, "dept")
            // console.log("unable", unable)
            if (unable) {
                unable = !handleProductColorDiff(product_c, "dept_sex")
            }
            if (unable) {
                unable = !handleProductColorDiff(product_c, "memberId")
            }
            if (unable) {
                inventoryList = cacheInventoryList
                break
            }
            currentProductionOrder.success = true
        }
        if (productionOrderList_c.every(i => i.success)) {
            confirmedProductionOrders = confirmedProductionOrders.concat(productionOrderList_c.map(i => ({ 数据ID: i.数据ID, orderId: i.orderId, code: i.code, apsStatus: 2 })))
            confirmedProducts = confirmedProducts.concat(products.filter(i => productionOrderList_c.map(sub => sub.itemDetail).flat().includes(i.uuid)).map(i => ({ 数据ID: i.数据ID, colorDiff: i.colorDiff })))
        }
    }
    // console.log("inventoryList", inventoryList)
    return { confirmedProducts, confirmedProductionOrders }
}
// a()