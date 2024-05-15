for (let i = 0; i < orderAfterMeasureBodyDetail.length; i++) {
    let item = orderAfterMeasureBodyDetail[i]
    if (item.styleOrigin === "style") {
        // 当前款式id
        let styleId = item.styleId
        let styleOrigin = "style"
        const itemDetail = item.itemDetail
        const c_product = product.filter(e => itemDetail.includes(e.uuid))

        let subStyleIngredient = styleIngredient.filter(sub => sub.styleId === styleId && sub.origin !== 1)

        // 主面料
        let main = style.find(e => e.数据ID === styleId)
        // 卡片
        let card = personalMeasureBodyStyle.filter(sub => sub.styleId === styleId && sub.styleOrigin === styleOrigin && c_product.some(e => e.personalMeasureBodyStyleId === sub.数据ID))

        // product number
        let productNum = itemDetail.length

        // 该款式下生产衣服的总数量
        let totalNum = orderAfterMeasureBodyDetail.filter(e => e.styleOrigin === "style" && e.styleId === styleId).map(e => e.itemDetail).flat().length

        // 当前style的sizeIngredientData
        let sizeData = sizeIngredientData.filter(sub => sub.styleId === styleId)
        let materialList = []
        if (sizeData && sizeData[0].sizeIngredientData && sizeData[0].sizeIngredientData.length) {
            // console.log("sizeData", sizeData)
            sizeData = sizeData[0].sizeIngredientData
            for (let j = 0; j < subStyleIngredient.length; j++) {
                // 当前款式配料的sizedata
                let cacheSizeData = sizeData.filter(sub => sub.ingredientLevelOneId + "" === subStyleIngredient[j].name).map(sub => sub.data).flat()
                // assistAttributeId-size字典
                // let dict = {}
                let cCard = JSON.parse(JSON.stringify(card)).map(sub => {
                    let cSizeData = cacheSizeData.find(e => e.standard === sub.standard && e.size === sub.size)
                    if (cSizeData) {
                        sub.assistAttributeId = cSizeData.assistAttributeId
                        sub.assistAttributeIdName = cSizeData.assistAttributeIdName
                        // dict[cSizeData.assistAttributeId] = cSizeData.size
                    }
                    return sub
                })
                //   console.log("cCard", cCard)
                subStyleIngredient[j].cCard = cCard
            }
            const subStyleIngredientCodeArr = Array.from(new Set(subStyleIngredient.map(e => e.code)))
            console.log("subStyleIngredientCodeArr", subStyleIngredientCodeArr)
            for (let j = 0; j < subStyleIngredientCodeArr.length; j++) {
                // 物料号
                let code = subStyleIngredientCodeArr[j]
                let arr = subStyleIngredient.filter(e => e.code === code)
                let cCardList = arr.map(e => e.cCard).flat()
                let assistAttributeIdArr = Array.from(new Set(cCardList.map(e => e.assistAttributeId)))
                // 款式配料用量
                let amount = arr.reduce((pre, next) => pre + next.amount, 0)
                // 单位
                let unit = arr[0].unit
                // 备注
                let description = arr.reduce((pre, next) => pre + next.description, "")
                // 配料物料名称
                const name = arr[0].materialName

                //   console.log("cCardList", cCardList)
                let result = assistAttributeIdArr.map(sub => {
                    if (sub) {
                        productNum = cCardList.filter(e => (e.assistAttributeId - 0) === (sub - 0)).reduce((pre, next) => pre + next.number, 0)
                    }
                    return {
                        assistAttributeId: sub,
                        size: (assistAttribute.find(e => e.数据ID === sub) || {}).standard,
                        unit,
                        productNum,
                        code,
                        totalNum,
                        styleIngredientAmount: amount,
                        description,
                        name
                    }
                })
                materialList = materialList.concat(result)
            }
        } else {
            subStyleIngredient = styleIngredient.filter(sub => sub.styleId === styleId)
            const subStyleIngredientCodeArr = Array.from(new Set(subStyleIngredient.map(e => e.code)))
            // console.log(subStyleIngredientCodeArr)
            for (let j = 0; j < subStyleIngredientCodeArr.length; j++) {
                // 物料号
                let code = subStyleIngredientCodeArr[j]
                let arr = subStyleIngredient.filter(e => e.code === code)
                // 款式配料用量
                let amount = arr.reduce((pre, next) => pre + next.amount, 0)
                // 单位
                let unit = arr[0].unit
                // 备注
                let description = arr.reduce((pre, next) => pre + next.description, "")
                let name = arr[0].materialName

                materialList.push({
                    totalNum,
                    code,
                    unit,
                    productNum,
                    styleIngredientAmount: amount,
                    description,
                    name
                })
            }
        }
        // code+size合并同类项
        let joinMaterialList = []
        const unicArr = materialList.map(e => e.size + e.code)
        // console.log("unicArr", unicArr)
        for (let n = 0; n < unicArr.length; n++) {
            let c_materialList = materialList.filter(e => e.size + e.code === unicArr[n])
            const styleIngredientAmount = c_materialList.reduce((pre, next) => pre + next.styleIngredientAmount, 0)
            c_materialList[0].styleIngredientAmount = styleIngredientAmount
            joinMaterialList.push(c_materialList[0])
        }
        item.materialList = (main.amountList || []).map(e => {
            // console.log("e", e)
            let o = {}
            o.code = e.code
            o.name = e.materialName
            o.unit = e.unit
            o.amount = e.amount
            o.styleIngredientAmount = e.amount
            return o
        }).concat(joinMaterialList)
    }
}
return { result: orderAfterMeasureBodyDetail }