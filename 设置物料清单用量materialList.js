for (let i = 0; i < measureBodyStyle.length; i++) {
  if (measureBodyStyle[i].styleOrigin === "style") {
    // 当前款式id
    let styleId = measureBodyStyle[i].styleId
    let styleOrigin = measureBodyStyle[i].styleOrigin

    let subStyleIngredient = styleIngredient.filter(sub => sub.styleId === styleId && sub.origin !== 1)
    
    // 主面料
    let main = style.find(e => e.数据ID === styleId)
    // 撞色描述
    let deltaPieceList = subStyleIngredient.filter(e => e.code !== main && e.origin === 1)
    // 卡片
    let card = personalMeasureBodyStyle.filter(sub => sub.styleId === styleId && sub.styleOrigin === styleOrigin)
    
    // product number
    let productNum = card.reduce((pre, next) => pre + next.number, 0)

    // 该款式下生产衣服的总数量
    let totalNum = card.reduce((pre, next) => pre + next.number, 0)

    // 合并同类项计算num
    /*measureBodyStyle[i].materialList = Array.from(new Set(subStyleIngredient.map(sub => sub.code))).map(sub => ({code: sub, unit: subStyleIngredient[0].unit, num: subStyleIngredient.reduce((pre, next) => pre + (next.amount || 0), 0)}))*/
    /* sizeIngredientData
    [ 
    {
      "data":[
                   {
                     "standard":"150/88B",
                     "size":"35B/150",
                     "assistAttributeId":"assistAttribute-1",
"assistAttributeIdName":""
                    }
                  ],
       "ingredientLevelOneId":1
    }
  ]
    */
    // 当前style的sizeIngredientData
    let sizeData = sizeIngredientData.filter(sub => sub.styleId === styleId)
    let materialList = []
    if (sizeData && sizeData[0].sizeIngredientData && sizeData[0].sizeIngredientData.length) {
      // console.log("sizeData", sizeData)
      sizeData = sizeData[0].sizeIngredientData
      for(let j = 0; j < subStyleIngredient.length; j++) {
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
        subStyleIngredient[j].cCard = cCard
      }
      const subStyleIngredientCodeArr = Array.from(new Set(subStyleIngredient.map(e => e.code)))
      console.log("subStyleIngredientCodeArr", subStyleIngredientCodeArr)
      for (let j = 0; j < subStyleIngredientCodeArr.length; j++) {
        // 物料号
        let code = subStyleIngredientCodeArr[j]
        let arr = subStyleIngredient.filter(e => e.code === code)
        console.log("arr", arr)
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
        
        // cCard = cCard.filter(sub => sub.assistAttributeId)
        // console.log("cCard", cCard)
        console.log("cCardList", cCardList)
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
        console.log("arr", arr)
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
    measureBodyStyle[i].materialList = (main.amountList || []).map(e => {
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
return { result: measureBodyStyle }